import type { ApiKeyResponse, ApiKeysRow } from './api-keys.types';

export function mapApiKeysManagementResponse(row: ApiKeysRow): ApiKeyResponse {
	return {
		id: row.publicId,
		name: row.name,
		key: row.key,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
