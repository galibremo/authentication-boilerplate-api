import {
	Body,
	Controller,
	Delete,
	Get,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

import { ApiResponse, createApiResponse } from '../../common/interceptors/api-response.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { KnowledgeBaseService } from './knowledge-base.service';
import { type UpdateKnowledgeBaseDto, updateKnowledgeBaseSchema } from './knowledge-base.schema';
import {
	KnowledgeBaseFileListResponse,
	KnowledgeBaseResponse,
} from './knowledge-base.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type UserWithoutPassword } from '../auth/auth.types';
import {
	mediaListQuerySchema,
	type MediaListQueryDto,
} from '../media/media.schema';

@UseGuards(JwtAuthGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
	constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

	@Get()
	async getKnowledgeBase(
		@CurrentUser() currentUser: UserWithoutPassword,
	): Promise<ApiResponse<KnowledgeBaseResponse>> {
		const knowledgeBase = await this.knowledgeBaseService.getKnowledgeBaseMessageById(
			currentUser.id,
		);

		return createApiResponse(HttpStatus.OK, 'Knowledge Base fetched successfully', knowledgeBase);
	}

	@Patch()
	async updateKnowledgeBase(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Request() request: ExpressRequest,
		@Body(new ZodValidationPipe(updateKnowledgeBaseSchema)) body: UpdateKnowledgeBaseDto,
	): Promise<ApiResponse<KnowledgeBaseResponse>> {
		const knowledgeBase = await this.knowledgeBaseService.createOrUpdateKnowledgeBase(
			body,
			currentUser.id,
		);
		return createApiResponse(HttpStatus.OK, 'Knowledge Base updated successfully', knowledgeBase);
	}

	@Get('files')
	async getKnowledgeBaseFiles(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Query(new ZodValidationPipe(mediaListQuerySchema)) query: MediaListQueryDto,
	): Promise<ApiResponse<KnowledgeBaseFileListResponse>> {
		const files = await this.knowledgeBaseService.getKnowledgeBaseFiles(
			currentUser.id,
			query,
		);

		return createApiResponse(
			HttpStatus.OK,
			'Knowledge base files fetched successfully',
			files,
		);
	}

	@Delete('files/:id')
	async deleteKnowledgeBaseFile(
		@CurrentUser() currentUser: UserWithoutPassword,
		@Param('id', ParseUUIDPipe) id: string,
	): Promise<ApiResponse<boolean>> {
		const deleted = await this.knowledgeBaseService.deleteKnowledgeBaseFile(currentUser, id);

		return createApiResponse(HttpStatus.OK, 'Knowledge base file deleted successfully', deleted);
	}
}
