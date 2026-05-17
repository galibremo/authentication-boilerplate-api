import type { SessionSchemaType, UserSchemaType } from '../../database/types';
import type {
	SessionResponse,
	SessionStatus,
	UserWithoutPassword,
	UserWithoutPasswordResponse,
} from './@types/auth.types';

export function stripUserPassword(user: UserSchemaType): UserWithoutPassword {
	const { password, twoFactorSecretEncrypted, ...userWithoutPassword } = user;
	void password;
	void twoFactorSecretEncrypted;

	return userWithoutPassword;
}

export function mapUserResponse(user: UserWithoutPassword): UserWithoutPasswordResponse {
	return {
		...user,
		id: user.publicId,
		imageInformation: null,
	};
}

export function mapSessionResponse(
	session: SessionSchemaType,
	currentSessionToken?: string,
	now: Date = new Date(),
): SessionResponse {
	return {
		id: session.publicId,
		deviceName: session.deviceName ?? 'Unknown Device',
		deviceType: session.deviceType ?? 'Unknown',
		ipAddress: session.ipAddress ?? 'Unknown',
		userAgent: session.userAgent ?? 'Unknown',
		status: getSessionStatus(session, now),
		isCurrent: !!currentSessionToken && session.token === currentSessionToken,
		isRevoked: session.isRevoked,
		twoFactorVerified: session.twoFactorVerified,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		expiresAt: session.expiresAt,
	};
}

function getSessionStatus(
	session: Pick<SessionSchemaType, 'expiresAt' | 'isRevoked'>,
	now: Date,
): SessionStatus {
	if (session.isRevoked) return 'revoked';
	if (session.expiresAt < now) return 'expired';
	return 'active';
}
