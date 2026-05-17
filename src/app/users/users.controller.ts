import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { RolesGuard } from '../../core/guards/roles.guard';
import { ApiResponse, createApiResponse } from '../../core/interceptors/api-response.interceptor';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import type { UserWithoutPassword } from '../auth/@types/auth.types';
import { JwtAuthGuard } from '../auth/auth.guard';
import type {
	DeleteUserResponse,
	RevokeUserSessionsResponse,
	ResetUserTwoFactorResponse,
	UserListResponse,
	UserManagementResponse,
} from './@types/users.types';
import {
	type CreateUserDto,
	createUserSchema,
	type UpdateUserDto,
	type UpdateUserRoleDto,
	updateUserSchema,
	updateUserRoleSchema,
	type UsersListQueryDto,
	usersListQuerySchema,
} from './users.schema';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	async listUsers(
		@Query(new ZodValidationPipe(usersListQuerySchema)) query: UsersListQueryDto,
	): Promise<ApiResponse<UserListResponse>> {
		const users = await this.usersService.listUsers(query);

		return createApiResponse(HttpStatus.OK, 'Users fetched successfully', users);
	}

	@Post()
	async createUser(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto,
	): Promise<ApiResponse<UserManagementResponse>> {
		const user = await this.usersService.createUser(currentUser, body);

		return createApiResponse(HttpStatus.CREATED, 'User created successfully', user);
	}

	@Patch(':id')
	async updateUser(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Param('id', ParseUUIDPipe) id: string,
		@Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto,
	): Promise<ApiResponse<UserManagementResponse>> {
		const user = await this.usersService.updateUser(currentUser, id, body);

		return createApiResponse(HttpStatus.OK, 'User updated successfully', user);
	}

	@Patch(':id/role')
	async updateUserRole(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Param('id', ParseUUIDPipe) id: string,
		@Body(new ZodValidationPipe(updateUserRoleSchema)) body: UpdateUserRoleDto,
	): Promise<ApiResponse<UserManagementResponse>> {
		const user = await this.usersService.updateUserRole(currentUser, id, body);

		return createApiResponse(HttpStatus.OK, 'User role updated successfully', user);
	}

	@Delete(':id')
	async deleteUser(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Param('id', ParseUUIDPipe) id: string,
	): Promise<ApiResponse<DeleteUserResponse>> {
		const result = await this.usersService.deleteUser(currentUser, id);

		return createApiResponse(HttpStatus.OK, 'User deleted successfully', result);
	}

	@Post(':id/sessions/revoke')
	@HttpCode(HttpStatus.OK)
	async revokeUserSessions(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Param('id', ParseUUIDPipe) id: string,
	): Promise<ApiResponse<RevokeUserSessionsResponse>> {
		const result = await this.usersService.revokeUserSessions(currentUser, id);

		return createApiResponse(HttpStatus.OK, 'User sessions revoked successfully', result);
	}

	@Post(':id/2fa/reset')
	@HttpCode(HttpStatus.OK)
	async resetUserTwoFactor(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Param('id', ParseUUIDPipe) id: string,
	): Promise<ApiResponse<ResetUserTwoFactorResponse>> {
		const result = await this.usersService.resetUserTwoFactor(currentUser, id);

		return createApiResponse(HttpStatus.OK, 'User two-factor authentication reset successfully', result);
	}
}
