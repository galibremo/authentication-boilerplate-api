import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UAParser } from 'ua-parser-js';

import { notFoundError, unauthorizedError } from '../../core/errors/domain-error';
import { sessionRenewalThreshold, sessionTimeout } from '../../core/helpers/constant.helpers';
import type { SessionSchemaType } from '../../database/types';
import type { SessionDataType, SessionListResponse } from './@types/auth.types';
import { mapSessionResponse } from './auth.mapper';
import type { SessionListQueryDto } from './auth.schema';
import { AuthSessionRepository } from './auth-session.repository';

@Injectable()
export class AuthSession {
	constructor(private readonly authSessionRepository: AuthSessionRepository) {}

	getSessionInfo(request: Request) {
		const userAgent = request.headers['user-agent'] || 'Unknown';
		const parser = new UAParser(userAgent);

		const device = parser.getDevice();
		const os = parser.getOS();
		const browser = parser.getBrowser();

		const deviceType = device.type || 'desktop';

		const deviceName =
			(os.name || 'Unknown OS') +
			' ' +
			(os.version || '') +
			' - ' +
			(browser.name || 'Unknown Client');

		const ipAddress =
			request.headers['x-forwarded-for']?.toString().split(',')[0] ||
			request.socket.remoteAddress ||
			'Unknown';

		return {
			userAgent: `${parser.getBrowser().name} - ${parser.getBrowser().version}`,
			deviceType,
			deviceName,
			ipAddress,
		};
	}

	async createSession(data: SessionDataType): Promise<string> {
		const session = await this.authSessionRepository.createSession(data);

		return session.token;
	}

	async validateSession(
		userId: number,
		sessionKeyOrId: string | number,
	): Promise<SessionSchemaType> {
		const session = await this.authSessionRepository.findSession(userId, sessionKeyOrId);

		if (!session) throw unauthorizedError('Invalid session token');

		if (session.isRevoked) throw unauthorizedError('Session has been revoked');

		if (session.expiresAt < new Date()) throw unauthorizedError('Session has expired');

		return session;
	}

	shouldExtendSession(
		session: Pick<SessionSchemaType, 'expiresAt'>,
		now: Date = new Date(),
	): boolean {
		return session.expiresAt.getTime() - now.getTime() <= sessionRenewalThreshold;
	}

	async extendSession(
		sessionId: number,
		expiresAt: Date = new Date(Date.now() + sessionTimeout),
	): Promise<SessionSchemaType> {
		const session = await this.authSessionRepository.extendSession(sessionId, expiresAt);

		if (!session) throw unauthorizedError('Invalid session token');

		return session;
	}

	async revokeSession(userId: number, sessionKeyOrId: string | number): Promise<boolean> {
		await this.validateSession(userId, sessionKeyOrId);
		await this.authSessionRepository.revokeSession(userId, sessionKeyOrId);

		return true;
	}

	async revokeUserSession(userId: number, sessionPublicId: string): Promise<SessionSchemaType> {
		const session = await this.authSessionRepository.revokeSessionByPublicIdForUser(
			userId,
			sessionPublicId,
		);

		if (!session) throw notFoundError('session_not_found', 'Session not found');

		return session;
	}

	revokeOtherUserSessions(userId: number, currentSessionToken: string): Promise<number> {
		return this.authSessionRepository.revokeOtherActiveUserSessions(
			userId,
			currentSessionToken,
		);
	}

	revokeAllUserSessions(userId: number): Promise<number> {
		return this.authSessionRepository.revokeAllUserSessions(userId);
	}

	listOfUserSessions(userId: number): Promise<SessionSchemaType[]> {
		return this.authSessionRepository.listUserSessions(userId);
	}

	async listUserSessions(
		userId: number,
		query: SessionListQueryDto,
		currentSessionToken: string,
	): Promise<SessionListResponse> {
		const result = await this.authSessionRepository.listUserSessionsPaginated(
			userId,
			query,
			currentSessionToken,
		);

		return {
			rows: result.rows.map(session => mapSessionResponse(session, currentSessionToken)),
			total: result.total,
			page: query.page ?? 1,
			pageSize: query.pageSize ?? 25,
			activeOtherSessionCount: result.activeOtherSessionCount,
		};
	}
}
