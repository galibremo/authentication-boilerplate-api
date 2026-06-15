import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Query,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ApiResponse, createApiResponse } from '../../common/interceptors/api-response.interceptor';
import { SkipCsrf } from '../csrf/csrf.decorator';
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
	@HttpCode(HttpStatus.OK)
	@UseInterceptors(
		FileInterceptor('data', {
			storage: memoryStorage(),
			limits: { fileSize: 10 * 1024 * 1024 },
		}),
	)
	async upload(
		@UploadedFile() file: Express.Multer.File,
	): Promise<ApiResponse<Record<string, unknown>>> {
		const text = file.buffer.toString('utf-8');
		const data = await this.n8nService.upload(text);
		return createApiResponse(HttpStatus.OK, 'File uploaded successfully', data);
	}

	@SkipCsrf()
	@Delete('clear')
	@HttpCode(HttpStatus.OK)
	async clear(): Promise<ApiResponse<{ success: boolean; message: string }>> {
		const result = await this.n8nService.clearCollection();
		const statusCode = result.success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR;
		return createApiResponse(statusCode, result.message, result);
	}
}
