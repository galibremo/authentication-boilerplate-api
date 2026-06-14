import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { notFoundError } from '../../core/errors/domain-error';
import type { ApiKeyResponse, ApiKeysListResponse, DeleteApiKeyResponse } from './api-keys.types';
import { mapApiKeysManagementResponse } from './api-keys.mapper';
import type { CreateApiKeyDto, UpdateApiKeyDto, ApiKeysListQueryDto } from './api-keys.schema';
import { ApiKeysRepository } from './api-keys.repository';

@Injectable()
export class ApiKeysService {
	constructor(private readonly apiKeysRepository: ApiKeysRepository) {}

	async listApiKeys(query: ApiKeysListQueryDto): Promise<ApiKeysListResponse> {
		const apiKeys = await this.apiKeysRepository.listApiKeys(query);

		return {
			rows: apiKeys.rows.map(mapApiKeysManagementResponse),
			total: apiKeys.total,
			page: apiKeys.page,
			pageSize: apiKeys.pageSize,
		};
	}

	async getApiKeyById(publicId: string): Promise<ApiKeyResponse> {
		const targetApiKey = await this.getTargetApiKey(publicId);
		return this.getManagementResponse(targetApiKey.id);
	}

	async createApiKey(data: CreateApiKeyDto): Promise<ApiKeyResponse> {
		const createdApiKey = await this.apiKeysRepository.createApiKey({
			name: data.name,
			key: data.key,
		});

		if (!createdApiKey) throw notFoundError('api_key_not_created', 'Failed to create API key');

		return this.getManagementResponse(createdApiKey.id);
	}

	async updateApiKey(publicId: string, data: UpdateApiKeyDto): Promise<ApiKeyResponse> {
		const targetApiKey = await this.getTargetApiKey(publicId);

		await this.apiKeysRepository.updateApiKey(targetApiKey.id, {
			...(Object.prototype.hasOwnProperty.call(data, 'name') ? { name: data.name } : {}),
			...(Object.prototype.hasOwnProperty.call(data, 'key') ? { key: data.key } : {}),
		});

		return this.getManagementResponse(targetApiKey.id);
	}

	async deleteApiKey(publicId: string): Promise<DeleteApiKeyResponse> {
		const targetApiKey = await this.getTargetApiKey(publicId);

		const deletedApiKey = await this.apiKeysRepository.deleteApiKey(targetApiKey.id);
		if (!deletedApiKey) throw notFoundError('api_key_not_found', 'API key not found');

		return { deleted: true };
	}

	private async getTargetApiKey(publicId: string) {
		const targetApiKey = await this.apiKeysRepository.findApiKeyByPublicId(publicId);

		if (!targetApiKey) throw notFoundError('api_key_not_found', 'API key not found');

		return targetApiKey;
	}

	private async getManagementResponse(apiKeyId: number): Promise<ApiKeyResponse> {
		const apiKey = await this.apiKeysRepository.findApiKeyById(apiKeyId);
		if (!apiKey) throw notFoundError('api_key_not_found', 'API key not found');

		return mapApiKeysManagementResponse(apiKey);
	}
}
