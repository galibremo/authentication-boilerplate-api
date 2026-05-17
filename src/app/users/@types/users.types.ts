import type { UserSchemaType } from '../../../database/types';
import type { RoleTypeEnum } from '../../../database/types';

export type UserRole = RoleTypeEnum;

export type UserSortKey =
	| 'name'
	| 'email'
	| 'emailVerified'
	| 'is2faEnabled'
	| 'role'
	| 'activeSessionCount'
	| 'createdAt'
	| 'updatedAt';

export type UserSortDirection = 'asc' | 'desc';

export type UserManagementRow = Pick<
	UserSchemaType,
	| 'id'
	| 'publicId'
	| 'name'
	| 'email'
	| 'image'
	| 'phone'
	| 'emailVerified'
	| 'is2faEnabled'
	| 'role'
	| 'createdAt'
	| 'updatedAt'
> & {
	activeSessionCount: number;
};

export type UserManagementResponse = Omit<UserManagementRow, 'id' | 'publicId'> & {
	id: string;
};

export interface UserListResponse {
	rows: UserManagementResponse[];
	total: number;
	page: number;
	pageSize: number;
}

export interface DeleteUserResponse {
	deleted: boolean;
}

export interface RevokeUserSessionsResponse {
	revokedCount: number;
}

export interface ResetUserTwoFactorResponse {
	reset: boolean;
	revokedCount: number;
}
