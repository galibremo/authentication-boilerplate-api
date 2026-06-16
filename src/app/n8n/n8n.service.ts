import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { EnvType } from '../../core/validators/env';
import type { UserWithoutPassword } from '../auth/auth.types';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { MediaService } from '../media/services/media.service';
import { N8NRepository } from './n8n.repository';

type N8nFileUploadPayload = {
	type: 'file_upload';
	fileId: string;
	userId: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
	secureUrl: string | null;
	collectionName: string;
};

@Injectable()
export class N8nService {
	private readonly logger = new Logger(N8nService.name);

	constructor(
		private readonly configService: ConfigService<EnvType, true>,
		private readonly n8nRepository: N8NRepository,
		private readonly mediaService: MediaService,
		private readonly knowledgeBaseService: KnowledgeBaseService,
	) {}

	async chat(chatInput: string, sessionId?: string): Promise<string> {
		const baseUrl = this.configService.get('N8N_WEBHOOK_URL', { infer: true });
		const webhookId = this.configService.get('N8N_WEBHOOK_ID', { infer: true });
		const n8nUrl = `${baseUrl}/${webhookId}`;

		const res = await fetch(n8nUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chatInput,
				sessionId: sessionId || randomUUID(),
			}),
		});

		const text = await res.text();

		if (!res.ok) {
			this.logger.error(`N8N Chat Error: ${res.status} ${text}`);
			throw new Error(text || 'N8N request failed');
		}

		return text;
	}

	async fetchChat(
		sessionId: string,
	): Promise<{ id: number; sessionId: string; message: unknown }[]> {
		return this.n8nRepository.findBySessionId(sessionId);
	}

	async upload(
		file: Express.Multer.File,
		user: UserWithoutPassword,
	): Promise<Record<string, unknown>> {
		const media = await this.mediaService.uploadDocumentFile(user.id, file);
		const collection = await this.knowledgeBaseService.getOrCreateUserCollection(user);
		const payload: N8nFileUploadPayload = {
			type: 'file_upload',
			fileId: media.publicId,
			userId: user.publicId,
			fileName: file.originalname,
			mimeType: file.mimetype,
			fileSize: file.size,
			secureUrl: media.secureUrl,
			collectionName: collection.collectionName,
		};
		const formData = this.createUploadFormData(file, payload);

		const baseUrl = this.configService.get('N8N_WEBHOOK_URL', { infer: true });
		const webhookId = this.configService.get('N8N_WEBHOOK_ID', { infer: true });
		const n8nUrl = `${baseUrl}/${webhookId}`;

		let res: Response;
		try {
			res = await fetch(n8nUrl, {
				method: 'POST',
				body: formData,
			});
		} catch (error) {
			await this.rollbackUploadedMedia(user.id, media.publicId);
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`N8N Upload Request Error: ${message}`);
			throw new Error('Upload to N8N failed', { cause: error });
		}

		const data: Record<string, unknown> = (await res.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;

		if (!res.ok) {
			this.logger.error(`N8N Upload Error: ${res.status}`);
			await this.rollbackUploadedMedia(user.id, media.publicId);
			throw new Error('Upload to N8N failed');
		}

		return data;
	}

	private async rollbackUploadedMedia(userId: number, publicId: string): Promise<void> {
		try {
			await this.mediaService.deleteMedia(userId, publicId);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Media rollback failed for ${publicId}: ${message}`);
		}
	}

	private createUploadFormData(
		file: Express.Multer.File,
		payload: N8nFileUploadPayload,
	): FormData {
		const formData = new FormData();
		const fileBytes = Uint8Array.from(file.buffer);
		const blob = new Blob([fileBytes], {
			type: file.mimetype || 'application/octet-stream',
		});

		formData.append('data', blob, file.originalname);
		formData.append('type', payload.type);
		formData.append('fileId', payload.fileId);
		formData.append('userId', payload.userId);
		formData.append('fileName', payload.fileName);
		formData.append('mimeType', payload.mimeType);
		formData.append('fileSize', String(payload.fileSize));
		formData.append('secureUrl', payload.secureUrl ?? '');
		formData.append('collectionName', payload.collectionName);

		return formData;
	}
}
