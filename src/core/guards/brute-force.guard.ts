import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	Logger,
	HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvType } from '../../core/validators/env';
import { SECURITY_STORE_TOKEN, type ISecurityStore } from '../security-store';
import { DomainError } from '../errors/domain-error';

/**
 * Exception thrown when a client is locked out due to too many failed login attempts.
 */
export class TooManyLoginAttemptsError extends DomainError {
	constructor(message: string) {
		super('too_many_login_attempts', message, HttpStatus.TOO_MANY_REQUESTS);
	}
}

/**
 * Brute-force login protection guard.
 *
 * Checks if the client IP is currently locked out due to too many failed login attempts.
 * If locked out, throws a 429 TooManyRequestsException with a safe error message.
 *
 * This guard should be applied to login endpoints (password, Google OAuth, magic-link request).
 *
 * Failed attempts are tracked by both email and IP address in the security store.
 * Lockout duration and max attempts are configurable via environment variables.
 */
@Injectable()
export class BruteForceGuard implements CanActivate {
	private readonly logger = new Logger(BruteForceGuard.name);

	constructor(
		@Inject(SECURITY_STORE_TOKEN)
		private readonly store: ISecurityStore,
		private readonly configService: ConfigService<EnvType, true>,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const ip = this.extractIp(request);

		if (!ip) {
			this.logger.warn('Could not extract client IP for brute-force check, allowing request');
			return true;
		}

		const lockoutMinutes = this.configService.get('LOGIN_LOCKOUT_MINUTES', { infer: true });

		// Check IP-based lockout
		const ipLockoutKey = `login:ip:${ip}`;
		const isIpLocked = await this.store.isLockedOut(ipLockoutKey);

		if (isIpLocked) {
			this.logger.warn(`Brute-force lockout: IP ${ip} is locked out for ${lockoutMinutes} minutes`);
			throw new TooManyLoginAttemptsError(
				`Too many failed login attempts. Please try again in ${lockoutMinutes} minutes.`,
			);
		}

		return true;
	}

	/**
	 * Record a failed login attempt. Call this from the controller after a login failure.
	 *
	 * Tracks attempts by both email and IP. Locks out either identifier when the threshold is exceeded.
	 * Uses safe error messages that do not reveal whether an account exists.
	 */
	static async recordFailedAttempt(
		store: ISecurityStore,
		configService: ConfigService<EnvType, true>,
		email: string,
		ip: string,
	): Promise<void> {
		const maxAttempts = configService.get('LOGIN_MAX_FAILED_ATTEMPTS', { infer: true });
		const lockoutMinutes = configService.get('LOGIN_LOCKOUT_MINUTES', { infer: true });
		const lockoutMs = lockoutMinutes * 60 * 1000;

		// Track by email (normalized to lowercase)
		const normalizedEmail = email.trim().toLowerCase();
		const emailKey = `login:email:${normalizedEmail}`;
		const emailCount = await store.recordFailedAttempt(emailKey, lockoutMs);

		// Track by IP
		const ipKey = `login:ip:${ip}`;
		const ipCount = await store.recordFailedAttempt(ipKey, lockoutMs);

		// Lock out if either exceeds threshold
		if (emailCount >= maxAttempts) {
			await store.setLockout(`lockout:login:email:${normalizedEmail}`, lockoutMs);
		}
		if (ipCount >= maxAttempts) {
			await store.setLockout(`lockout:login:ip:${ip}`, lockoutMs);
		}
	}

	/**
	 * Clear all failed login attempt tracking for a user.
	 * Call this from the controller after a successful login.
	 */
	static async clearFailedAttempts(
		store: ISecurityStore,
		email: string,
		ip: string,
	): Promise<void> {
		const normalizedEmail = email.trim().toLowerCase();

		await Promise.all([
			store.clearFailedAttempts(`login:email:${normalizedEmail}`),
			store.clearFailedAttempts(`login:ip:${ip}`),
			store.delete(`lockout:login:email:${normalizedEmail}`),
			store.delete(`lockout:login:ip:${ip}`),
		]);
	}

	/**
	 * Extract the client IP address from the request, respecting proxy headers.
	 */
	private extractIp(req: Request): string {
		const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
		const realIp = req.headers['x-real-ip'] as string | undefined;

		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}

		if (realIp) {
			return realIp.trim();
		}

		const rawIp = req.ip || req.connection?.remoteAddress || '';
		return typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : String(rawIp);
	}
}
