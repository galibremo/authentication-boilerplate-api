import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Request,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest, Response } from 'express';
import { memoryStorage } from 'multer';

import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { badRequestError } from '../../core/errors/domain-error';
import AppHelpers from '../../core/helpers/app.helpers';
import {
	type ApiResponse,
	createApiResponse,
} from '../../core/interceptors/api-response.interceptor';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { EnvType } from '../../core/validators/env';
import { FILE_SIZE_LIMIT, singleFileSchema, ZodFileValidationPipe } from '../media/media.pipe';
import type {
	SessionListResponse,
	SessionResponse,
	TwoFactorDisableResponse,
	TwoFactorRecoveryCodesResponse,
	TwoFactorSetupStartResponse,
	TwoFactorStatusResponse,
	TwoFactorVerifyResponse,
	UserWithoutPassword,
	UserWithoutPasswordResponse,
} from './@types/auth.types';
import { JwtAuthGuard } from './auth.guard';
import { mapSessionResponse, mapUserResponse } from './auth.mapper';
import {
	type GoogleLoginDto,
	googleLoginSchema,
	type MagicLinkRequestDto,
	magicLinkRequestSchema,
	type MagicLinkVerifyDto,
	magicLinkVerifySchema,
	type SessionListQueryDto,
	sessionListQuerySchema,
	type TwoFactorCodeDto,
	twoFactorCodeSchema,
	type UpdateProfileDto,
	updateProfileSchema,
} from './auth.schema';
import { AuthService } from './auth.service';
import { AuthSession } from './auth.session';
import { AuthTwoFactorService } from './auth-two-factor.service';
import { PartialJwtAuthGuard } from './partial-jwt-auth.guard';
import type { PartialAuthRequest } from './strategies/jwt-partial.strategy';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly authSession: AuthSession,
		private readonly authTwoFactorService: AuthTwoFactorService,
		private readonly configService: ConfigService<EnvType, true>,
	) {}

	@Post('magic-link/request')
	@HttpCode(HttpStatus.OK)
	async requestMagicLink(
		@Body(new ZodValidationPipe(magicLinkRequestSchema)) requestDto: MagicLinkRequestDto,
	): Promise<ApiResponse<null>> {
		await this.authService.requestMagicLink(requestDto.email, requestDto.redirectUrl);

		return createApiResponse(
			HttpStatus.OK,
			'If the email exists, a magic link has been sent',
			null,
		);
	}

	@Get('magic-link/verify')
	async verifyMagicLink(
		@Query(new ZodValidationPipe(magicLinkVerifySchema)) verifyDto: MagicLinkVerifyDto,
		@Request() request: ExpressRequest,
		@Res() response: Response,
	): Promise<void> {
		const userDeviceInfo = this.authSession.getSessionInfo(request);
		const result = await this.authService.verifyMagicLink(verifyDto, userDeviceInfo);

		response.cookie(
			'access-token',
			result.sessionToken,
			AppHelpers.accessTokenCookieConfig(this.configService),
		);

		response.redirect(
			this.authService.getMagicLinkRedirectUrl(verifyDto.redirectUrl ?? verifyDto.redirect),
		);
	}

	@Post('magic-link/verify')
	@HttpCode(HttpStatus.OK)
	async verifyMagicLinkJson(
		@Body(new ZodValidationPipe(magicLinkVerifySchema)) verifyDto: MagicLinkVerifyDto,
		@Request() request: ExpressRequest,
		@Res({ passthrough: true }) response: Response,
	): Promise<ApiResponse<UserWithoutPasswordResponse>> {
		const userDeviceInfo = this.authSession.getSessionInfo(request);
		const result = await this.authService.verifyMagicLink(verifyDto, userDeviceInfo);

		response.cookie(
			'access-token',
			result.sessionToken,
			AppHelpers.accessTokenCookieConfig(this.configService),
		);

		return createApiResponse(
			HttpStatus.OK,
			'Magic link verified successfully',
			mapUserResponse(result.user),
		);
	}

	@UseGuards(PartialJwtAuthGuard)
	@Post('logout')
	@HttpCode(HttpStatus.OK)
	async logout(@Request() request: ExpressRequest): Promise<ApiResponse<null>> {
		const userId = request.user?.id;
		const sessionToken = request.cookies['access-token'] as string | undefined;

		if (!userId || !sessionToken) throw badRequestError('No active session found');

		await this.authSession.revokeSession(userId, sessionToken);

		request.res?.clearCookie(
			'access-token',
			AppHelpers.accessTokenClearCookieConfig(this.configService),
		);

		return createApiResponse(HttpStatus.OK, 'Logout successful', null);
	}

	@UseGuards(JwtAuthGuard)
	@Get('2fa/status')
	async getTwoFactorStatus(
		@CurrentUser() user: UserWithoutPassword,
	): Promise<ApiResponse<TwoFactorStatusResponse>> {
		const status = await this.authTwoFactorService.getStatus(user);

		return createApiResponse(HttpStatus.OK, 'Two-factor status fetched successfully', status);
	}

	@UseGuards(JwtAuthGuard)
	@Post('2fa/setup/start')
	@HttpCode(HttpStatus.OK)
	async startTwoFactorSetup(
		@CurrentUser() user: UserWithoutPassword,
	): Promise<ApiResponse<TwoFactorSetupStartResponse>> {
		const setup = await this.authTwoFactorService.startSetup(user);

		return createApiResponse(HttpStatus.OK, 'Two-factor setup started successfully', setup);
	}

	@UseGuards(JwtAuthGuard)
	@Post('2fa/setup/confirm')
	@HttpCode(HttpStatus.OK)
	async confirmTwoFactorSetup(
		@CurrentUser() user: UserWithoutPassword,
		@Request() request: ExpressRequest,
		@Body(new ZodValidationPipe(twoFactorCodeSchema)) body: TwoFactorCodeDto,
	): Promise<ApiResponse<TwoFactorRecoveryCodesResponse>> {
		const session = await this.getCurrentSession(user, request);
		const result = await this.authTwoFactorService.confirmSetup(user, session, body.code);

		return createApiResponse(HttpStatus.OK, 'Two-factor setup confirmed successfully', result);
	}

	@UseGuards(PartialJwtAuthGuard)
	@Post('2fa/verify')
	@HttpCode(HttpStatus.OK)
	async verifyTwoFactor(
		@CurrentUser() user: UserWithoutPassword,
		@Request() request: PartialAuthRequest,
		@Body(new ZodValidationPipe(twoFactorCodeSchema)) body: TwoFactorCodeDto,
	): Promise<ApiResponse<TwoFactorVerifyResponse>> {
		const result = await this.authTwoFactorService.verifyTwoFactor(
			user,
			this.getPartialAuthSession(request),
			body.code,
		);

		return createApiResponse(HttpStatus.OK, 'Two-factor verified successfully', result);
	}

	@UseGuards(JwtAuthGuard)
	@Post('2fa/disable')
	@HttpCode(HttpStatus.OK)
	async disableTwoFactor(
		@CurrentUser() user: UserWithoutPassword,
		@Request() request: ExpressRequest,
		@Body(new ZodValidationPipe(twoFactorCodeSchema)) body: TwoFactorCodeDto,
	): Promise<ApiResponse<TwoFactorDisableResponse>> {
		const sessionToken = this.getSessionToken(request);
		const session = await this.authSession.validateSession(user.id, sessionToken);
		const result = await this.authTwoFactorService.disableTwoFactor(
			user,
			session,
			sessionToken,
			body.code,
		);

		return createApiResponse(HttpStatus.OK, 'Two-factor disabled successfully', result);
	}

	@UseGuards(JwtAuthGuard)
	@Post('2fa/recovery-codes/regenerate')
	@HttpCode(HttpStatus.OK)
	async regenerateTwoFactorRecoveryCodes(
		@CurrentUser() user: UserWithoutPassword,
		@Request() request: ExpressRequest,
		@Body(new ZodValidationPipe(twoFactorCodeSchema)) body: TwoFactorCodeDto,
	): Promise<ApiResponse<TwoFactorRecoveryCodesResponse>> {
		const session = await this.getCurrentSession(user, request);
		const result = await this.authTwoFactorService.regenerateRecoveryCodes(
			user,
			session,
			body.code,
		);

		return createApiResponse(
			HttpStatus.OK,
			'Two-factor recovery codes regenerated successfully',
			result,
		);
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	getProfile(
		@CurrentUser() user: UserWithoutPassword,
	): ApiResponse<UserWithoutPasswordResponse> {
		return createApiResponse(
			HttpStatus.OK,
			'User profile fetched successfully',
			mapUserResponse(user),
		);
	}

	@UseGuards(JwtAuthGuard)
	@Get('sessions')
	async getSessions(
		@CurrentUser() user: UserWithoutPassword,
		@Query(new ZodValidationPipe(sessionListQuerySchema)) query: SessionListQueryDto,
		@Request() request: ExpressRequest,
	): Promise<ApiResponse<SessionListResponse>> {
		const sessionToken = request.cookies['access-token'] as string | undefined;

		if (!sessionToken) throw badRequestError('No active session found');

		const sessions = await this.authSession.listUserSessions(user.id, query, sessionToken);

		return createApiResponse(HttpStatus.OK, 'Sessions fetched successfully', sessions);
	}

	@UseGuards(JwtAuthGuard)
	@Post('sessions/revoke-others')
	@HttpCode(HttpStatus.OK)
	async revokeOtherSessions(
		@CurrentUser() user: UserWithoutPassword,
		@Request() request: ExpressRequest,
	): Promise<ApiResponse<{ revokedCount: number }>> {
		const sessionToken = request.cookies['access-token'] as string | undefined;

		if (!sessionToken) throw badRequestError('No active session found');

		const revokedCount = await this.authSession.revokeOtherUserSessions(user.id, sessionToken);

		return createApiResponse(HttpStatus.OK, 'Other sessions revoked successfully', {
			revokedCount,
		});
	}

	@UseGuards(JwtAuthGuard)
	@Post('sessions/:id/revoke')
	@HttpCode(HttpStatus.OK)
	async revokeSession(
		@CurrentUser() user: UserWithoutPassword,
		@Param('id', ParseUUIDPipe) id: string,
		@Request() request: ExpressRequest,
	): Promise<ApiResponse<SessionResponse>> {
		const sessionToken = request.cookies['access-token'] as string | undefined;

		if (!sessionToken) throw badRequestError('No active session found');

		const revokedSession = await this.authSession.revokeUserSession(user.id, id);

		if (revokedSession.token === sessionToken) {
			request.res?.clearCookie(
				'access-token',
				AppHelpers.accessTokenClearCookieConfig(this.configService),
			);
		}

		return createApiResponse(
			HttpStatus.OK,
			'Session revoked successfully',
			mapSessionResponse(revokedSession, sessionToken),
		);
	}

	@UseGuards(JwtAuthGuard)
	@Put('profile')
	async updateProfile(
		@Body(new ZodValidationPipe(updateProfileSchema)) updateData: UpdateProfileDto,
		@CurrentUser() user: UserWithoutPassword,
	): Promise<ApiResponse<UserWithoutPasswordResponse>> {
		const updatedUser = await this.authService.updateUser(user.id, updateData);

		return createApiResponse(
			HttpStatus.OK,
			'Profile updated successfully',
			mapUserResponse(updatedUser),
		);
	}

	@UseGuards(JwtAuthGuard)
	@Put('profile/image')
	@UseInterceptors(
		FileInterceptor('avatar', {
			storage: memoryStorage(),
			// Multer-level hard limit (fast fail before Zod, still validate in Zod too)
			limits: { fileSize: FILE_SIZE_LIMIT },
		}),
	)
	async uploadMedia(
		@UploadedFile(new ZodFileValidationPipe(singleFileSchema))
		file: Express.Multer.File,
		@CurrentUser() user: UserWithoutPassword,
	): Promise<ApiResponse<UserWithoutPasswordResponse>> {
		const updatedUser = await this.authService.updateUserProfileImage(user.id, file);

		return createApiResponse(
			HttpStatus.OK,
			'Media uploaded successfully',
			mapUserResponse(updatedUser),
		);
	}

	@Post('google')
	@HttpCode(HttpStatus.OK)
	async googleLogin(
		@Body(new ZodValidationPipe(googleLoginSchema)) googleLoginDto: GoogleLoginDto,
		@Request() request: ExpressRequest,
	): Promise<ApiResponse<UserWithoutPasswordResponse>> {
		const googleProfile = await this.authService.verifyGoogleCredential(googleLoginDto.credential);
		const user = await this.authService.findOrCreateGoogleUser(googleProfile);
		const userDeviceInfo = this.authSession.getSessionInfo(request);

		const accessToken = await this.authService.generateAccessToken({
			userId: user.id,
			email: user.email,
			userAgent: userDeviceInfo.userAgent,
			ipAddress: userDeviceInfo.ipAddress,
			deviceName: userDeviceInfo.deviceName,
			deviceType: userDeviceInfo.deviceType,
		});

		request.res?.cookie(
			'access-token',
			accessToken,
			AppHelpers.accessTokenCookieConfig(this.configService),
		);

		return createApiResponse(HttpStatus.OK, 'Google login successful', mapUserResponse(user));
	}

	private getSessionToken(request: ExpressRequest): string {
		const sessionToken = request.cookies['access-token'] as string | undefined;

		if (!sessionToken) throw badRequestError('No active session found');

		return sessionToken;
	}

	private getCurrentSession(user: UserWithoutPassword, request: ExpressRequest) {
		return this.authSession.validateSession(user.id, this.getSessionToken(request));
	}

	private getPartialAuthSession(request: PartialAuthRequest) {
		if (!request.authSession) throw badRequestError('No active session found');

		return request.authSession;
	}
}
