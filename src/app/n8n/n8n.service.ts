import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { EnvType } from '../../core/validators/env';
import { N8NRepository } from './n8n.repository';

@Injectable()
export class N8nService {
	private readonly logger = new Logger(N8nService.name);

	constructor(
		private readonly configService: ConfigService<EnvType, true>,
		private readonly n8nRepository: N8NRepository,
	) {}

	async chat(chatInput: string, sessionId?: string): Promise<string> {
		const baseUrl =
			this.configService.get('N8N_CHAT_WEBHOOK', { infer: true }) || 'http://localhost:5678';
		const webhookId = this.configService.get('N8N_CHAT_WEBHOOK_ID', { infer: true });
		const n8nUrl = `${baseUrl}/webhook/${webhookId}`;

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

	async upload(fileContent: string): Promise<Record<string, unknown>> {
		const baseUrl =
			this.configService.get('N8N_API_URL', { infer: true }) || 'http://localhost:5678';
		const webhookId = this.configService.get('N8N_UPLOAD_WEBHOOK_ID', { infer: true });
		const n8nUrl = `${baseUrl}/webhook/${webhookId}`;

		const res = await fetch(n8nUrl, {
			method: 'POST',
			body: fileContent,
			headers: { 'Content-Type': 'text/plain' },
		});

		const data: Record<string, unknown> = (await res.json().catch(() => ({}))) as Record<string, unknown>;

		if (!res.ok) {
			this.logger.error(`N8N Upload Error: ${res.status}`);
			throw new Error('Upload to N8N failed');
		}

		return data;
	}

	async clearCollection(): Promise<{ success: boolean; message: string }> {
		const chromaUrl =
			this.configService.get('CHROMA_URL', { infer: true }) || 'http://localhost:8000';
		const collection =
			this.configService.get('N8N_COLLECTION_NAME', { infer: true }) || 'office_dataset';
		const base = `${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database`;

		try {
			const delRes = await fetch(`${base}/collections/${collection}`, {
				method: 'DELETE',
			});

			if (delRes.ok) {
				return { success: true, message: `Collection "${collection}" deleted successfully.` };
			}

			if (delRes.status === 404) {
				return { success: true, message: 'Collection does not exist, nothing to delete.' };
			}

			const err = await delRes.text().catch(() => 'unknown');
			return { success: false, message: err };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return { success: false, message };
		}
	}
}
