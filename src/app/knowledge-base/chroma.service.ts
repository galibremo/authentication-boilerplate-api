import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { badGatewayError } from '../../core/errors/domain-error';
import type { EnvType } from '../../core/validators/env';

type ChromaDeleteInput = {
	fileId: string;
	userId: string;
};

type ChromaCollection = {
	id?: string;
	name?: string;
};

@Injectable()
export class ChromaService {
	private readonly logger = new Logger(ChromaService.name);
	private collectionId: string | null = null;

	constructor(private readonly configService: ConfigService<EnvType, true>) {}

	async deleteFileVectors({ fileId, userId }: ChromaDeleteInput): Promise<void> {
		const collectionId = await this.getCollectionId(fileId);
		const url = `${this.getBaseUrl()}/collections/${collectionId}/delete`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				where: {
					$and: [{ fileId: { $eq: fileId } }, { userId: { $eq: userId } }],
				},
			}),
		}).catch(error => {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Chroma delete request failed: ${message}`);
			throw badGatewayError(
				'chroma_delete_failed',
				'Could not delete vectors for this file. Please try again.',
				{ fileId },
			);
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			this.logger.error(`Chroma delete failed: ${res.status} ${text}`);
			throw badGatewayError(
				'chroma_delete_failed',
				'Could not delete vectors for this file. Please try again.',
				{ fileId, status: res.status },
			);
		}
	}

	private async getCollectionId(fileId: string): Promise<string> {
		if (this.collectionId) return this.collectionId;

		const collectionName = this.configService.get('CHROMA_COLLECTION_NAME', { infer: true });
		const url = `${this.getBaseUrl()}/collections`;
		const res = await fetch(url).catch(error => {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Chroma collection lookup failed: ${message}`);
			throw badGatewayError(
				'chroma_collection_lookup_failed',
				'Could not find the Chroma collection. Please try again.',
				{ fileId },
			);
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			this.logger.error(`Chroma collection lookup failed: ${res.status} ${text}`);
			throw badGatewayError(
				'chroma_collection_lookup_failed',
				'Could not find the Chroma collection. Please try again.',
				{ fileId, status: res.status },
			);
		}

		const body = (await res.json().catch(() => [])) as unknown;
		const collection = this.parseCollections(body).find(item => item.name === collectionName);

		if (!collection?.id) {
			this.logger.error(`Chroma collection "${collectionName}" was not found`);
			throw badGatewayError(
				'chroma_collection_not_found',
				'Could not find the Chroma collection. Please check CHROMA_COLLECTION_NAME.',
				{ fileId, collectionName },
			);
		}

		this.collectionId = collection.id;
		return collection.id;
	}

	private parseCollections(body: unknown): ChromaCollection[] {
		if (Array.isArray(body)) return body.filter(this.isChromaCollection);

		if (body && typeof body === 'object' && 'collections' in body) {
			const collections = (body as { collections?: unknown }).collections;
			if (Array.isArray(collections)) return collections.filter(this.isChromaCollection);
		}

		return [];
	}

	private isChromaCollection(value: unknown): value is ChromaCollection {
		if (!value || typeof value !== 'object') return false;

		return 'id' in value || 'name' in value;
	}

	private getBaseUrl(): string {
		const chromaUrl = this.configService.get('CHROMA_URL', { infer: true }).replace(/\/$/, '');
		const tenant = this.configService.get('CHROMA_TENANT', { infer: true });
		const database = this.configService.get('CHROMA_DATABASE', { infer: true });

		return `${chromaUrl}/api/v2/tenants/${tenant}/databases/${database}`;
	}
}
