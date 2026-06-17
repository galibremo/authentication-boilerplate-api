import { Injectable } from '@nestjs/common';

import { notFoundError } from '../../core/errors/domain-error';
import type { ApiKeyResponse, ApiKeysListResponse, DeleteApiKeyResponse } from './api-keys.types';
import { mapApiKeysManagementResponse } from './api-keys.mapper';
import type { CreateApiKeyDto, UpdateApiKeyDto, ApiKeysListQueryDto } from './api-keys.schema';
import { ApiKeysRepository } from './api-keys.repository';
import { CryptoService } from '../../core/crypto/crypto.service';

@Injectable()
export class ApiKeysService {
	constructor(
		private readonly apiKeysRepository: ApiKeysRepository,
		private readonly cryptoService: CryptoService,
	) {}

	async listApiKeys(query: ApiKeysListQueryDto, userId: number): Promise<ApiKeysListResponse> {
		const apiKeys = await this.apiKeysRepository.listApiKeys(query, userId);

		return {
			rows: apiKeys.rows.map(mapApiKeysManagementResponse),
			total: apiKeys.total,
			page: apiKeys.page,
			pageSize: apiKeys.pageSize,
		};
	}

	async getApiKeyById(publicId: string, userId: number): Promise<ApiKeyResponse> {
		const targetApiKey = await this.getTargetApiKey(publicId, userId);
		return this.getManagementResponse(targetApiKey.id, userId);
	}

	async createApiKey(data: CreateApiKeyDto, userId: number): Promise<ApiKeyResponse> {
		const key = this.generateApiKey(userId);

		const createdApiKey = await this.apiKeysRepository.createApiKey({
			name: data.name,
			key,
			userId,
		});

		if (!createdApiKey) throw notFoundError('api_key_not_created', 'Failed to create API key');

		return this.getManagementResponse(createdApiKey.id, userId);
	}

	async updateApiKey(publicId: string, data: UpdateApiKeyDto, userId: number): Promise<ApiKeyResponse> {
		const targetApiKey = await this.getTargetApiKey(publicId, userId);

		await this.apiKeysRepository.updateApiKey(targetApiKey.id, {
			...(Object.prototype.hasOwnProperty.call(data, 'name') ? { name: data.name } : {}),
		});

		return this.getManagementResponse(targetApiKey.id, userId);
	}

	async deleteApiKey(publicId: string, userId: number): Promise<DeleteApiKeyResponse> {
		const targetApiKey = await this.getTargetApiKey(publicId, userId);

		const deletedApiKey = await this.apiKeysRepository.deleteApiKey(targetApiKey.id);
		if (!deletedApiKey) throw notFoundError('api_key_not_found', 'API key not found');

		return { deleted: true };
	}

	private async getTargetApiKey(publicId: string, userId: number) {
		const targetApiKey = await this.apiKeysRepository.findApiKeyByPublicId(publicId, userId);

		if (!targetApiKey) throw notFoundError('api_key_not_found', 'API key not found');

		return targetApiKey;
	}

	private async getManagementResponse(apiKeyId: number, userId: number): Promise<ApiKeyResponse> {
		const apiKey = await this.apiKeysRepository.findApiKeyById(apiKeyId, userId);
		if (!apiKey) throw notFoundError('api_key_not_found', 'API key not found');

		return mapApiKeysManagementResponse(apiKey);
	}

	private generateApiKey(userId: number): string {
		const payload = `${userId}:${Date.now()}`;
		const encrypted = this.cryptoService.encrypt(payload);
		const urlSafe = encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

		return `ak_${urlSafe}`;
	}
}
