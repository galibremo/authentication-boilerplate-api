import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { conflictError, isDatabaseUniqueViolation, notFoundError } from '../../core/errors/domain-error';
import type { UserWithoutPassword } from '../auth/@types/auth.types';
import { AuthTwoFactorService } from '../auth/auth-two-factor.service';
import type {
	DeleteUserResponse,
	RevokeUserSessionsResponse,
	ResetUserTwoFactorResponse,
	UserListResponse,
	UserManagementResponse,
} from './@types/users.types';
import { mapUserManagementResponse } from './users.mapper';
import { UsersPolicy } from './users.policy';
import { UsersRepository } from './users.repository';
import type {
	CreateUserDto,
	UpdateUserDto,
	UpdateUserRoleDto,
	UsersListQueryDto,
} from './users.schema';

@Injectable()
export class UsersService {
	constructor(
		private readonly usersRepository: UsersRepository,
		private readonly authTwoFactorService: AuthTwoFactorService,
	) {}

	async listUsers(query: UsersListQueryDto): Promise<UserListResponse> {
		const users = await this.usersRepository.listUsers(query);

		return {
			rows: users.rows.map(mapUserManagementResponse),
			total: users.total,
			page: users.page,
			pageSize: users.pageSize,
		};
	}

	async createUser(
		currentUser: UserWithoutPassword,
		data: CreateUserDto,
	): Promise<UserManagementResponse> {
		UsersPolicy.assertCanAssignRole(currentUser, data.role);
		await this.assertEmailAvailable(data.email);

		const password = data.password ? await bcrypt.hash(data.password, 10) : null;

		try {
			const createdUser = await this.usersRepository.createUser({
				name: data.name ?? null,
				email: data.email,
				password,
				phone: data.phone ?? null,
				emailVerified: data.emailVerified ?? false,
				role: data.role,
			});

			if (!createdUser) throw notFoundError('user_not_found', 'User not found');

			return this.getManagementResponse(createdUser.id);
		} catch (error) {
			this.throwEmailConflictIfUniqueViolation(error);
			throw error;
		}
	}

	async updateUser(
		currentUser: UserWithoutPassword,
		publicId: string,
		data: UpdateUserDto,
	): Promise<UserManagementResponse> {
		const targetUser = await this.getTargetUser(publicId);

		UsersPolicy.assertCanManageUser(currentUser, targetUser);

		if (data.email && data.email !== targetUser.email) {
			await this.assertEmailAvailable(data.email, targetUser.id);
		}

		try {
			await this.usersRepository.updateUser(targetUser.id, {
				...(Object.prototype.hasOwnProperty.call(data, 'name') ? { name: data.name ?? null } : {}),
				...(data.email ? { email: data.email } : {}),
				...(Object.prototype.hasOwnProperty.call(data, 'phone') ? { phone: data.phone ?? null } : {}),
				...(typeof data.emailVerified === 'boolean' ? { emailVerified: data.emailVerified } : {}),
			});

			return this.getManagementResponse(targetUser.id);
		} catch (error) {
			this.throwEmailConflictIfUniqueViolation(error);
			throw error;
		}
	}

	async updateUserRole(
		currentUser: UserWithoutPassword,
		publicId: string,
		data: UpdateUserRoleDto,
	): Promise<UserManagementResponse> {
		const targetUser = await this.getTargetUser(publicId);

		UsersPolicy.assertCanManageUser(currentUser, targetUser);
		UsersPolicy.assertCanAssignRole(currentUser, data.role);

		if (targetUser.role !== data.role) {
			await this.usersRepository.updateUserRole(targetUser.id, data.role);
		}

		return this.getManagementResponse(targetUser.id);
	}

	async deleteUser(
		currentUser: UserWithoutPassword,
		publicId: string,
	): Promise<DeleteUserResponse> {
		const targetUser = await this.getTargetUser(publicId);

		UsersPolicy.assertCanManageUser(currentUser, targetUser);

		const deletedUser = await this.usersRepository.deleteUser(targetUser.id);
		if (!deletedUser) throw notFoundError('user_not_found', 'User not found');

		return { deleted: true };
	}

	async revokeUserSessions(
		currentUser: UserWithoutPassword,
		publicId: string,
	): Promise<RevokeUserSessionsResponse> {
		const targetUser = await this.getTargetUser(publicId);

		UsersPolicy.assertCanManageUser(currentUser, targetUser);

		const revokedCount = await this.usersRepository.revokeAllUserSessions(targetUser.id);

		return { revokedCount };
	}

	async resetUserTwoFactor(
		currentUser: UserWithoutPassword,
		publicId: string,
	): Promise<ResetUserTwoFactorResponse> {
		const targetUser = await this.getTargetUser(publicId);

		UsersPolicy.assertCanManageUser(currentUser, targetUser);

		return this.authTwoFactorService.resetUserTwoFactor(targetUser.id);
	}

	private async getTargetUser(publicId: string) {
		const targetUser = await this.usersRepository.findUserByPublicId(publicId);

		if (!targetUser) throw notFoundError('user_not_found', 'User not found');

		return targetUser;
	}

	private async getManagementResponse(userId: number): Promise<UserManagementResponse> {
		const user = await this.usersRepository.findUserManagementRowById(userId);
		if (!user) throw notFoundError('user_not_found', 'User not found');

		return mapUserManagementResponse(user);
	}

	private async assertEmailAvailable(email: string, excludedUserId?: number): Promise<void> {
		const existingUser = await this.usersRepository.findUserByEmail(email);

		if (existingUser && existingUser.id !== excludedUserId) {
			throw conflictError('email_already_exists', 'A user with this email already exists.');
		}
	}

	private throwEmailConflictIfUniqueViolation(error: unknown): void {
		if (isDatabaseUniqueViolation(error)) {
			throw conflictError('email_already_exists', 'A user with this email already exists.');
		}
	}
}
