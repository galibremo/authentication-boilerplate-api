import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PDFParse } from 'pdf-parse';

import { DomainError, validationFailed } from '../../core/errors/domain-error';
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
	originalFileName?: string;
	originalMimeType?: string;
	originalFileSize?: number;
};

type N8nForwardedFile = {
	buffer: Buffer;
	fileName: string;
	mimeType: string;
	fileSize: number;
	originalFileName?: string;
	originalMimeType?: string;
	originalFileSize?: number;
};

const BANGLA_PRE_BASE_VOWEL_SIGNS = '\u09bf\u09c7\u09c8';
const BANGLA_POST_BASE_VOWEL_SIGNS = '\u09be\u09c0-\u09c4\u09cb\u09cc';
const BANGLA_BASE_LETTER = '[\u0985-\u09b9\u09dc-\u09df\u09f0-\u09f1]';
const BANGLA_CONSONANT_CLUSTER = `${BANGLA_BASE_LETTER}\u09bc?(?:\u09cd${BANGLA_BASE_LETTER}\u09bc?)*`;

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
		const webhookId = this.configService.get('N8N_WEBHOOK_CHAT_ID', { infer: true });
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
		const forwardedFile = await this.createForwardedFile(file);
		const media = await this.mediaService.uploadDocumentFile(user.id, file);
		const collection = await this.knowledgeBaseService.getOrCreateUserCollection(user);
		const payload: N8nFileUploadPayload = {
			type: 'file_upload',
			fileId: media.publicId,
			userId: user.publicId,
			fileName: forwardedFile.fileName,
			mimeType: forwardedFile.mimeType,
			fileSize: forwardedFile.fileSize,
			secureUrl: media.secureUrl,
			collectionName: collection.collectionName,
			originalFileName: forwardedFile.originalFileName,
			originalMimeType: forwardedFile.originalMimeType,
			originalFileSize: forwardedFile.originalFileSize,
		};
		const formData = this.createUploadFormData(forwardedFile, payload);

		const baseUrl = this.configService.get('N8N_WEBHOOK_URL', { infer: true });
		const webhookId = this.configService.get('N8N_WEBHOOK_UPLOAD_ID', { infer: true });
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

	private async createForwardedFile(file: Express.Multer.File): Promise<N8nForwardedFile> {
		if (!this.isPdfFile(file)) {
			return {
				buffer: file.buffer,
				fileName: file.originalname,
				mimeType: file.mimetype || 'application/octet-stream',
				fileSize: file.size,
			};
		}

		const text = await this.extractPdfText(file);
		const buffer = Buffer.from(text, 'utf8');

		return {
			buffer,
			fileName: this.getPdfTextFileName(file.originalname),
			mimeType: 'text/plain',
			fileSize: buffer.byteLength,
			originalFileName: file.originalname,
			originalMimeType: file.mimetype,
			originalFileSize: file.size,
		};
	}

	private async extractPdfText(file: Express.Multer.File): Promise<string> {
		const parser = new PDFParse({ data: Uint8Array.from(file.buffer) });

		try {
			const result = await parser.getText();
			const text = this.normalizePdfText(result.text).trim();

			if (!text) {
				throw validationFailed('PDF does not contain extractable text.', {
					fileName: file.originalname,
				});
			}

			return text;
		} catch (error) {
			if (error instanceof DomainError) throw error;

			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`PDF text extraction failed for ${file.originalname}: ${message}`);
			throw validationFailed('PDF could not be parsed as text.', {
				fileName: file.originalname,
			});
		} finally {
			await parser.destroy().catch(error => {
				const message = error instanceof Error ? error.message : String(error);
				this.logger.warn(`PDF parser cleanup failed for ${file.originalname}: ${message}`);
			});
		}
	}

	private normalizePdfText(text: string): string {
		return this.normalizeBanglaPdfText(text)
			.replace(/\u09cd\s+(?=[\u0980-\u09ff])/g, '\u09cd')
			.normalize('NFC');
	}

	private normalizeBanglaPdfText(text: string): string {
		const preBaseMarkPattern = new RegExp(
			`(^|[^\u0980-\u09ff]|[${BANGLA_POST_BASE_VOWEL_SIGNS}])([${BANGLA_PRE_BASE_VOWEL_SIGNS}])(${BANGLA_CONSONANT_CLUSTER})`,
			'g',
		);

		return text.normalize('NFC').replace(preBaseMarkPattern, '$1$3$2');
	}

	private isPdfFile(file: Express.Multer.File): boolean {
		return (
			file.mimetype === 'application/pdf' ||
			file.originalname.toLowerCase().endsWith('.pdf')
		);
	}

	private getPdfTextFileName(fileName: string): string {
		const baseName = fileName.replace(/\.[^.]+$/, '').trim() || 'document';
		return `${baseName}.txt`;
	}

	private createUploadFormData(file: N8nForwardedFile, payload: N8nFileUploadPayload): FormData {
		const formData = new FormData();
		const fileBytes = Uint8Array.from(file.buffer);
		const blob = new Blob([fileBytes], {
			type: file.mimeType || 'application/octet-stream',
		});

		formData.append('data', blob, file.fileName);
		formData.append('type', payload.type);
		formData.append('fileId', payload.fileId);
		formData.append('userId', payload.userId);
		formData.append('fileName', payload.fileName);
		formData.append('mimeType', payload.mimeType);
		formData.append('fileSize', String(payload.fileSize));
		formData.append('secureUrl', payload.secureUrl ?? '');
		formData.append('collectionName', payload.collectionName);
		if (payload.originalFileName) formData.append('originalFileName', payload.originalFileName);
		if (payload.originalMimeType) formData.append('originalMimeType', payload.originalMimeType);
		if (payload.originalFileSize) {
			formData.append('originalFileSize', String(payload.originalFileSize));
		}

		return formData;
	}
}
