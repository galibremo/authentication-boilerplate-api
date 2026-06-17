import {
	Body,
	Controller,
	Delete,
	Get,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

import { ApiResponse, createApiResponse } from '../../common/interceptors/api-response.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { ApiKeyResponse, ApiKeysListResponse, DeleteApiKeyResponse } from './api-keys.types';
import {
	type CreateApiKeyDto,
	createApiKeySchema,
	type ApiKeysListQueryDto,
	apiKeysListQuerySchema,
	type UpdateApiKeyDto,
	updateApiKeySchema,
} from './api-keys.schema';
import { ApiKeysService } from './api-keys.service';

@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
	constructor(private readonly apiKeysService: ApiKeysService) {}

	@Get()
	async listApiKeys(
		@Request() request: ExpressRequest,
		@Query(new ZodValidationPipe(apiKeysListQuerySchema)) query: ApiKeysListQueryDto,
	): Promise<ApiResponse<ApiKeysListResponse>> {
		const userId = (request.user as unknown as { id: number }).id;
		const apiKeys = await this.apiKeysService.listApiKeys(query, userId);

		return createApiResponse(HttpStatus.OK, 'ApiKeys fetched successfully', apiKeys);
	}

	@Get(':id')
	async getApiKey(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() request: ExpressRequest,
	): Promise<ApiResponse<ApiKeyResponse>> {
		const userId = (request.user as unknown as { id: number }).id;
		const apiKey = await this.apiKeysService.getApiKeyById(id, userId);

		return createApiResponse(HttpStatus.OK, 'ApiKey fetched successfully', apiKey);
	}

	@Post()
	async createApiKey(
		@Request() request: ExpressRequest,
		@Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyDto,
	): Promise<ApiResponse<ApiKeyResponse>> {
		const userId = (request.user as unknown as { id: number }).id;
		const apiKey = await this.apiKeysService.createApiKey(body, userId);

		return createApiResponse(HttpStatus.CREATED, 'ApiKey created successfully', apiKey);
	}

	@Patch(':id')
	async updateApiKey(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() request: ExpressRequest,
		@Body(new ZodValidationPipe(updateApiKeySchema)) body: UpdateApiKeyDto,
	): Promise<ApiResponse<ApiKeyResponse>> {
		const userId = (request.user as unknown as { id: number }).id;
		const apiKey = await this.apiKeysService.updateApiKey(id, body, userId);

		return createApiResponse(HttpStatus.OK, 'ApiKey updated successfully', apiKey);
	}

	@Delete(':id')
	async deleteApiKey(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() request: ExpressRequest,
	): Promise<ApiResponse<DeleteApiKeyResponse>> {
		const userId = (request.user as unknown as { id: number }).id;
		const result = await this.apiKeysService.deleteApiKey(id, userId);

		return createApiResponse(HttpStatus.OK, 'ApiKey deleted successfully', result);
	}
}
