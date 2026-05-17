import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

import {
	badRequestError,
	notFoundError,
	unauthorizedError,
} from '../../core/errors/domain-error';
import { EnvType } from '../../core/validators/env';
import { CryptoService } from '../../crypto/crypto.service';
import type { SessionSchemaType, UserSchemaType } from '../../database/types';
import type {
	TwoFactorDisableResponse,
	TwoFactorRecoveryCodesResponse,
	TwoFactorSetupStartResponse,
	TwoFactorStatusResponse,
	TwoFactorVerifyResponse,
	UserWithoutPassword,
} from './@types/auth.types';
import { AuthSession } from './auth.session';
import { AuthTwoFactorRepository } from './auth-two-factor.repository';

const setupExpiresMs = 10 * 60 * 1000;
const recoveryCodeCount = 10;
const twoFactorMaxAttempts = 5;
const twoFactorLockMs = 10 * 60 * 1000;

@Injectable()
export class AuthTwoFactorService {
	constructor(
		private readonly twoFactorRepository: AuthTwoFactorRepository,
		private readonly authSession: AuthSession,
		private readonly cryptoService: CryptoService,
		private readonly configService: ConfigService<EnvType, true>,
	) {}

	async getStatus(user: UserWithoutPassword): Promise<TwoFactorStatusResponse> {
		const recoveryCodeCount = user.is2faEnabled
			? await this.twoFactorRepository.countUnusedRecoveryCodes(user.id)
			: 0;

		return {
			enabled: user.is2faEnabled,
			recoveryCodeCount,
		};
	}

	async startSetup(user: UserWithoutPassword): Promise<TwoFactorSetupStartResponse> {
		if (user.is2faEnabled) {
			throw badRequestError('Two-factor authentication is already enabled.');
		}

		const secret = generateSecret();
		const secretEncrypted = this.cryptoService.encrypt(secret);
		const expiresAt = new Date(Date.now() + setupExpiresMs);
		const issuer = this.getIssuer();
		const otpauthUrl = generateURI({
			issuer,
			label: user.email,
			secret,
			strategy: 'totp',
			period: 30,
		});

		await this.twoFactorRepository.replaceSetup({
			userId: user.id,
			secretEncrypted,
			expiresAt,
		});

		return {
			otpauthUrl,
			qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl),
			manualEntryKey: secret,
			expiresAt,
		};
	}

	async confirmSetup(
		user: UserWithoutPassword,
		session: SessionSchemaType,
		code: string,
	): Promise<TwoFactorRecoveryCodesResponse> {
		if (user.is2faEnabled) {
			throw badRequestError('Two-factor authentication is already enabled.');
		}

		await this.assertSessionCanAttemptTwoFactor(session);

		const setup = await this.twoFactorRepository.findSetupByUserId(user.id);
		if (!setup) throw notFoundError('two_factor_setup_not_found', 'Two-factor setup not found.');

		if (setup.expiresAt < new Date()) {
			await this.twoFactorRepository.deleteSetupByUserId(user.id);
			throw unauthorizedError('Two-factor setup has expired.');
		}

		const secret = this.cryptoService.decrypt(setup.secretEncrypted);

		if (!this.verifyTotp(code, secret)) {
			await this.recordFailedAttempt(session);
			throw unauthorizedError('Invalid two-factor code.');
		}

		const recoveryCodes = this.generateRecoveryCodes();
		const recoveryCodeHashes = recoveryCodes.map(recoveryCode =>
			this.hashRecoveryCode(recoveryCode),
		);

		await this.twoFactorRepository.transaction(async tx => {
			await this.twoFactorRepository.enableTwoFactor(user.id, setup.secretEncrypted, tx);
			await this.twoFactorRepository.replaceRecoveryCodes(user.id, recoveryCodeHashes, tx);
			await this.twoFactorRepository.deleteSetupByUserId(user.id, tx);
		});
		await this.authSession.markTwoFactorVerified(session.id);

		return { recoveryCodes };
	}

	async verifyTwoFactor(
		user: UserWithoutPassword,
		session: SessionSchemaType,
		code: string,
	): Promise<TwoFactorVerifyResponse> {
		const userWithSecret = await this.getUserWithSecret(user.id);

		if (!userWithSecret.is2faEnabled) {
			await this.authSession.markTwoFactorVerified(session.id);
			return { verified: true };
		}

		await this.assertSessionCanAttemptTwoFactor(session);

		const verified = await this.verifyEnabledUserCode(userWithSecret, code);

		if (!verified) {
			await this.recordFailedAttempt(session);
			throw unauthorizedError('Invalid two-factor code.');
		}

		await this.authSession.markTwoFactorVerified(session.id);

		return { verified: true };
	}

	async disableTwoFactor(
		user: UserWithoutPassword,
		session: SessionSchemaType,
		currentSessionToken: string,
		code: string,
	): Promise<TwoFactorDisableResponse> {
		const userWithSecret = await this.getUserWithSecret(user.id);

		if (!userWithSecret.is2faEnabled) {
			return { disabled: true, revokedOtherSessionCount: 0 };
		}

		await this.assertSessionCanAttemptTwoFactor(session);

		const verified = await this.verifyEnabledUserCode(userWithSecret, code);

		if (!verified) {
			await this.recordFailedAttempt(session);
			throw unauthorizedError('Invalid two-factor code.');
		}

		await this.twoFactorRepository.transaction(async tx => {
			await this.twoFactorRepository.disableTwoFactor(user.id, tx);
			await this.twoFactorRepository.deleteSetupByUserId(user.id, tx);
			await this.twoFactorRepository.deleteRecoveryCodesByUserId(user.id, tx);
		});

		const revokedOtherSessionCount = await this.authSession.revokeOtherUserSessions(
			user.id,
			currentSessionToken,
		);

		return { disabled: true, revokedOtherSessionCount };
	}

	async regenerateRecoveryCodes(
		user: UserWithoutPassword,
		session: SessionSchemaType,
		code: string,
	): Promise<TwoFactorRecoveryCodesResponse> {
		const userWithSecret = await this.getUserWithSecret(user.id);

		if (!userWithSecret.is2faEnabled) {
			throw badRequestError('Two-factor authentication is not enabled.');
		}

		await this.assertSessionCanAttemptTwoFactor(session);

		const verified = await this.verifyEnabledUserCode(userWithSecret, code);

		if (!verified) {
			await this.recordFailedAttempt(session);
			throw unauthorizedError('Invalid two-factor code.');
		}

		const recoveryCodes = this.generateRecoveryCodes();
		await this.twoFactorRepository.replaceRecoveryCodes(
			user.id,
			recoveryCodes.map(recoveryCode => this.hashRecoveryCode(recoveryCode)),
		);

		return { recoveryCodes };
	}

	async resetUserTwoFactor(userId: number): Promise<{ reset: boolean; revokedCount: number }> {
		await this.twoFactorRepository.transaction(async tx => {
			await this.twoFactorRepository.disableTwoFactor(userId, tx);
			await this.twoFactorRepository.deleteSetupByUserId(userId, tx);
			await this.twoFactorRepository.deleteRecoveryCodesByUserId(userId, tx);
		});

		const revokedCount = await this.authSession.revokeAllUserSessions(userId);

		return { reset: true, revokedCount };
	}

	private async getUserWithSecret(userId: number): Promise<UserSchemaType> {
		const user = await this.twoFactorRepository.findUserById(userId);
		if (!user) throw notFoundError('user_not_found', 'User not found');

		return user;
	}

	private async verifyEnabledUserCode(user: UserSchemaType, code: string): Promise<boolean> {
		if (!user.twoFactorSecretEncrypted) return false;

		const secret = this.cryptoService.decrypt(user.twoFactorSecretEncrypted);
		if (this.verifyTotp(code, secret)) return true;

		const recoveryCode = await this.twoFactorRepository.findUnusedRecoveryCode(
			user.id,
			this.hashRecoveryCode(code),
		);

		if (!recoveryCode) return false;

		const usedRecoveryCode = await this.twoFactorRepository.markRecoveryCodeUsed(
			recoveryCode.id,
		);

		return Boolean(usedRecoveryCode);
	}

	private verifyTotp(code: string, secret: string): boolean {
		try {
			return verifySync({
				secret,
				token: code.replace(/\s/g, ''),
				strategy: 'totp',
				period: 30,
				epochTolerance: 30,
			}).valid;
		} catch {
			return false;
		}
	}

	private async assertSessionCanAttemptTwoFactor(session: SessionSchemaType): Promise<void> {
		if (!session.twoFactorLockedUntil) return;

		if (session.twoFactorLockedUntil > new Date()) {
			throw unauthorizedError('Too many invalid two-factor attempts. Try again later.', {
				lockedUntil: session.twoFactorLockedUntil.toISOString(),
			});
		}

		await this.authSession.updateTwoFactorFailureState(session.id, {
			twoFactorFailedAttempts: 0,
			twoFactorLockedUntil: null,
		});
	}

	private async recordFailedAttempt(session: SessionSchemaType): Promise<void> {
		const now = new Date();
		const currentAttempts =
			session.twoFactorLockedUntil && session.twoFactorLockedUntil <= now
				? 0
				: session.twoFactorFailedAttempts;
		const nextAttempts = currentAttempts + 1;
		const shouldLock = nextAttempts >= twoFactorMaxAttempts;

		await this.authSession.updateTwoFactorFailureState(session.id, {
			twoFactorFailedAttempts: nextAttempts,
			twoFactorLockedUntil: shouldLock ? new Date(Date.now() + twoFactorLockMs) : null,
		});
	}

	private generateRecoveryCodes(): string[] {
		return Array.from({ length: recoveryCodeCount }, () => {
			const value = randomBytes(5).toString('hex').toUpperCase();
			return `${value.slice(0, 5)}-${value.slice(5)}`;
		});
	}

	private hashRecoveryCode(code: string): string {
		return this.cryptoService.hash(code.replace(/[\s-]/g, '').toUpperCase());
	}

	private getIssuer(): string {
		try {
			return new URL(this.configService.get('APP_URL', { infer: true })).host;
		} catch {
			return 'Boilerplate';
		}
	}
}
