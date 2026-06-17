import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { badGatewayError } from '../../core/errors/domain-error';
import type { EnvType } from '../../core/validators/env';

type ChromaDeleteInput = {
	fileId: string;
	collectionName: string;
};

type ChromaCollection = {
	id?: string;
	name?: string;
};

@Injectable()
export class ChromaService {
	private readonly logger = new Logger(ChromaService.name);
	private readonly collectionIds = new Map<string, string>();

	constructor(private readonly configService: ConfigService<EnvType, true>) {}

	async deleteFileVectors({ fileId, collectionName }: ChromaDeleteInput): Promise<void> {
		const collectionId = await this.getCollectionId(collectionName, fileId);
		const url = `${this.getBaseUrl()}/collections/${collectionId}/delete`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				where: {
					fileId: { $eq: fileId },
				},
			}),
		}).catch(error => {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Chroma delete request failed: ${message}`);
			throw badGatewayError(
				'chroma_delete_failed',
				'Could not delete vectors for this file. Please try again.',
				{ fileId, collectionName },
			);
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			this.logger.error(`Chroma delete failed: ${res.status} ${text}`);
			throw badGatewayError(
				'chroma_delete_failed',
				'Could not delete vectors for this file. Please try again.',
				{ fileId, collectionName, status: res.status },
			);
		}
	}

	private async getCollectionId(collectionName: string, fileId: string): Promise<string> {
		const cachedCollectionId = this.collectionIds.get(collectionName);
		if (cachedCollectionId) return cachedCollectionId;

		const url = `${this.getBaseUrl()}/collections`;
		const res = await fetch(url).catch(error => {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Chroma collection lookup failed: ${message}`);
			throw badGatewayError(
				'chroma_collection_lookup_failed',
				'Could not find the Chroma collection. Please try again.',
				{ fileId, collectionName },
			);
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			this.logger.error(`Chroma collection lookup failed: ${res.status} ${text}`);
			throw badGatewayError(
				'chroma_collection_lookup_failed',
				'Could not find the Chroma collection. Please try again.',
				{ fileId, collectionName, status: res.status },
			);
		}

		const body = (await res.json().catch(() => [])) as unknown;
		const collection = this.parseCollections(body).find(item => item.name === collectionName);

		if (!collection?.id) {
			this.logger.error(`Chroma collection "${collectionName}" was not found`);
			throw badGatewayError(
				'chroma_collection_not_found',
				'Could not find the user knowledge base collection. Please upload a file first, then try again.',
				{ fileId, collectionName },
			);
		}

		this.collectionIds.set(collectionName, collection.id);
		return collection.id;
	}

	private parseCollections(body: unknown): ChromaCollection[] {
		if (Array.isArray(body)) return body.filter(value => this.isChromaCollection(value));

		if (body && typeof body === 'object' && 'collections' in body) {
			const collections = (body as { collections?: unknown }).collections;
			if (Array.isArray(collections)) {
				return collections.filter(value => this.isChromaCollection(value));
			}
		}

		return [];
	}

	private isChromaCollection(value: unknown): value is ChromaCollection {
		if (!value || typeof value !== 'object') return false;

		return 'id' in value || 'name' in value;
	}

	private getBaseUrl(): string {
		const chromaUrl = this.configService.get('CHROMA_URL', { infer: true }).replace(/\/$/, '');

		return `${chromaUrl}/api/v2/tenants/${tenant}/databases/${database}`;
	}
}
