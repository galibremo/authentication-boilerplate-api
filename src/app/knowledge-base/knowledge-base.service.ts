import { Injectable } from '@nestjs/common';

import { notFoundError } from '../../core/errors/domain-error';
import type { KnowledgeBaseResponse } from './knowledge-base.types';
import type { UpdateKnowledgeBaseDto } from './knowledge-base.schema';
import { KnowledgeBaseRepository } from './knowledge-base.repository';
@Injectable()
export class KnowledgeBaseService {
	constructor(private readonly knowledgeBaseRepository: KnowledgeBaseRepository) {}

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

	private async getTargetKnowledgeBase(userId: number): Promise<KnowledgeBaseResponse> {
		const targetKnowledgeBase =
			await this.knowledgeBaseRepository.findKnowledgeBaseMessageByUserId(userId);

		if (!targetKnowledgeBase)
			throw notFoundError('knowledge_base_message_not_found', 'Knowledge base message not found');

		return targetKnowledgeBase;
	}
}
