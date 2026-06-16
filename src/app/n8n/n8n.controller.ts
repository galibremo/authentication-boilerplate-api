import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Query,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse, createApiResponse } from '../../common/interceptors/api-response.interceptor';
import type { UserWithoutPassword } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { N8N_UPLOAD_FILE_SIZE_LIMIT, N8nUploadFileValidationPipe } from './n8n.pipe';
import { N8nService } from './n8n.service';

@Controller('n8n')
export class N8nController {
	constructor(private readonly n8nService: N8nService) {}

	@Post('chat')
	@HttpCode(HttpStatus.OK)
	async chat(
		@Body() body: { chatInput: string; sessionId?: string },
	): Promise<ApiResponse<{ text: string }>> {
		const text = await this.n8nService.chat(body.chatInput, body.sessionId);
		return createApiResponse(HttpStatus.OK, 'Chat response received', { text });
	}

	@Get('fetch-chat')
	@HttpCode(HttpStatus.OK)
	async fetchChat(
		@Query('sessionId') sessionId: string,
	): Promise<ApiResponse<{ id: number; sessionId: string; message: unknown }[]>> {
		const chatHistory = await this.n8nService.fetchChat(sessionId);
		return createApiResponse(HttpStatus.OK, 'Chat history fetched', chatHistory);
	}

	@Post('upload')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	@UseInterceptors(
		FileInterceptor('data', {
			storage: memoryStorage(),
			limits: { fileSize: N8N_UPLOAD_FILE_SIZE_LIMIT },
		}),
	)
	async upload(
		@UploadedFile(new N8nUploadFileValidationPipe()) file: Express.Multer.File,
		@CurrentUser() user: UserWithoutPassword,
	): Promise<ApiResponse<Record<string, unknown>>> {
		const data = await this.n8nService.upload(file, user);
		return createApiResponse(HttpStatus.OK, 'File uploaded successfully', data);
	}
}
