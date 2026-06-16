import { Injectable } from '@nestjs/common';

import { notFoundError } from '../../core/errors/domain-error';
import { MediaService } from '../media/services/media.service';
import type { MediaListQueryDto } from '../media/media.schema';
import { ChromaService } from './chroma.service';
import type {
	KnowledgeBaseFileListResponse,
	KnowledgeBaseResponse,
} from './knowledge-base.types';
import type { UpdateKnowledgeBaseDto } from './knowledge-base.schema';
import { KnowledgeBaseRepository } from './knowledge-base.repository';
@Injectable()
export class KnowledgeBaseService {
	constructor(
		private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
		private readonly mediaService: MediaService,
		private readonly chromaService: ChromaService,
	) {}

	async getKnowledgeBaseMessageById(userId: number): Promise<KnowledgeBaseResponse> {
		const targetKnowledgeBase = await this.getTargetKnowledgeBase(userId);
		return targetKnowledgeBase;
	}

	async createOrUpdateKnowledgeBase(
		data: UpdateKnowledgeBaseDto,
		userid: number,
	): Promise<KnowledgeBaseResponse> {
		const createOrUpdateKnowledgeBase =
			await this.knowledgeBaseRepository.createOrUpdateKnowledgeBaseMessage({
				systemMessage: data.systemMessage,
				owner: userid,
			});

		if (!createOrUpdateKnowledgeBase)
			throw notFoundError(
				'knowledge_base_message_not_created',
				'Knowledge base message could not be created or updated',
			);

		return createOrUpdateKnowledgeBase;
	}

	async getKnowledgeBaseFiles(
		userId: number,
		query: MediaListQueryDto,
	): Promise<KnowledgeBaseFileListResponse> {
		const { data, pagination } = await this.mediaService.getDocumentMedia(userId, query);

		return {
			rows: data.map(media => ({
				id: media.publicId,
				filename: media.filename,
				mimeType: media.mimeType,
				fileSize: media.fileSize,
				secureUrl: media.secureUrl,
				mediaType: media.mediaType,
				altText: media.altText,
				width: media.width,
				height: media.height,
				tags: media.tags,
				createdAt: media.createdAt,
				updatedAt: media.updatedAt,
			})),
			total: pagination?.totalItems ?? data.length,
			page: query.page ?? 1,
			pageSize: query.pageSize ?? 10,
		};
	}

	async deleteKnowledgeBaseFile(
		user: { id: number; publicId: string },
		filePublicId: string,
	): Promise<boolean> {
		const media = await this.mediaService.getDocumentDeleteRow(user.id, filePublicId);

		await this.chromaService.deleteFileVectors({
			fileId: media.publicId,
			userId: user.publicId,
		});

		await this.mediaService.deleteMedia(user.id, filePublicId);

		return true;
	}

	private async getTargetKnowledgeBase(userId: number): Promise<KnowledgeBaseResponse> {
		const targetKnowledgeBase =
			await this.knowledgeBaseRepository.findKnowledgeBaseMessageByUserId(userId);

		if (!targetKnowledgeBase)
			throw notFoundError('knowledge_base_message_not_found', 'Knowledge base message not found');

		return targetKnowledgeBase;
	}
}
