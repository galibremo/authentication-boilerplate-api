import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { unauthorizedError } from '../../../core/errors/domain-error';
import AppHelpers from '../../../core/helpers/app.helpers';
import { EnvType } from '../../../core/validators/env';
import { CryptoService } from '../../../crypto/crypto.service';
import type { SessionSchemaType } from '../../../database/types';
import { AuthService } from '../auth.service';
import { AuthSession } from '../auth.session';

interface JwtPayload {
	sub: number;
	email: string;
}

export type PartialAuthRequest = Request & {
	authSession?: SessionSchemaType;
};

@Injectable()
export class JwtPartialStrategy extends PassportStrategy(Strategy, 'jwt-partial') {
	constructor(
		private readonly configService: ConfigService<EnvType, true>,
		private readonly authService: AuthService,
		private readonly authSession: AuthSession,
		private readonly cryptoService: CryptoService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: Request) => {
					return request?.cookies?.['access-token'] as string | null;
				},
			]),
			ignoreExpiration: true,
			secretOrKey: configService.get('AUTH_SECRET', { infer: true }),
			passReqToCallback: true,
		});
	}

	async validate(request: PartialAuthRequest, payload: JwtPayload): Promise<Express.User> {
		const jwtToken = request.cookies?.['access-token'] as string;

		if (!jwtToken) throw unauthorizedError('Unauthorized');

		const decryptedUserId = this.cryptoService.decrypt(payload.sub.toString());
		payload.sub = parseInt(decryptedUserId, 10);

		const user = await this.authService.findUserById(payload.sub);

		if (!user.emailVerified) throw unauthorizedError('Email not verified');

		const session = await this.authSession.validateSession(user.id, jwtToken);
		request.authSession = session;

		if (this.authSession.shouldExtendSession(session)) {
			await this.authSession.extendSession(session.id);
			request.res?.cookie(
				'access-token',
				jwtToken,
				AppHelpers.accessTokenCookieConfig(this.configService),
			);
		}

		return user;
	}
}
