import { SessionSchemaType, UserSchemaType } from '../../../database/types';

export type UserWithoutPassword = Omit<UserSchemaType, 'password' | 'twoFactorSecretEncrypted'>;

export type CreateUser = Omit<
	UserSchemaType,
	| 'id'
	| 'publicId'
	| 'is2faEnabled'
	| 'twoFactorSecretEncrypted'
	| 'createdAt'
	| 'updatedAt'
>;

export type SessionDataType = Omit<
	SessionSchemaType,
	| 'id'
	| 'publicId'
	| 'twoFactorVerified'
	| 'twoFactorFailedAttempts'
	| 'twoFactorLockedUntil'
	| 'isRevoked'
	| 'createdAt'
	| 'updatedAt'
>;

// Api Response Types
export type UserWithoutPasswordResponse = Omit<
	UserSchemaType,
	'id' | 'publicId' | 'password' | 'twoFactorSecretEncrypted'
> & { id: string };

export type SessionStatus = 'active' | 'revoked' | 'expired';

export type SessionSortKey =
	| 'deviceName'
	| 'deviceType'
	| 'ipAddress'
	| 'userAgent'
	| 'status'
	| 'createdAt'
	| 'expiresAt';

export type SessionSortDirection = 'asc' | 'desc';

export type SessionResponse = Pick<
	SessionSchemaType,
	'isRevoked' | 'twoFactorVerified' | 'createdAt' | 'updatedAt' | 'expiresAt'
> & {
	id: string;
	deviceName: string;
	deviceType: string;
	ipAddress: string;
	userAgent: string;
	status: SessionStatus;
	isCurrent: boolean;
};

export interface SessionListResponse {
	rows: SessionResponse[];
	total: number;
	page: number;
	pageSize: number;
	activeOtherSessionCount: number;
}

export interface TwoFactorStatusResponse {
	enabled: boolean;
	recoveryCodeCount: number;
}

export interface TwoFactorSetupStartResponse {
	otpauthUrl: string;
	qrCodeDataUrl: string;
	manualEntryKey: string;
	expiresAt: Date;
}

export interface TwoFactorRecoveryCodesResponse {
	recoveryCodes: string[];
}

export interface TwoFactorVerifyResponse {
	verified: boolean;
}

export interface TwoFactorDisableResponse {
	disabled: boolean;
	revokedOtherSessionCount: number;
}

export interface UserInformation {
	userId: number;
	email: string;
	userAgent: string;
	ipAddress: string;
	deviceName: string;
	deviceType: string;
	expirationTime?: number;
}

export interface MagicLinkSessionInfo {
	userAgent: string;
	ipAddress: string;
	deviceName: string;
	deviceType: string;
}

export interface VerifiedGoogleProfile {
	email: string;
	name: string | null;
	picture: string | null;
	googleId: string;
	emailVerified: boolean;
}
