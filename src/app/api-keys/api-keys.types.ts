import type { ApiKeySchemaType } from '../../core/database/types';

export type ApiKeySortKey = 'name' | 'key' | 'createdAt' | 'updatedAt';

export type ApiKeySortDirection = 'asc' | 'desc';

export type ApiKeysRow = Pick<
	ApiKeySchemaType,
	'id' | 'publicId' | 'name' | 'key' | 'createdAt' | 'updatedAt'
>;

export type ApiKeyResponse = Omit<ApiKeysRow, 'id' | 'publicId'> & {
	id: string;
};

export interface ApiKeysListResponse {
	rows: ApiKeyResponse[];
	total: number;
	page: number;
	pageSize: number;
}

export interface DeleteApiKeyResponse {
	deleted: boolean;
}
