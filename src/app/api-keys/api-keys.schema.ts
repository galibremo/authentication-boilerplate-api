import { z } from 'zod';

import { baseQuerySchema, type SortableField } from '../../core/validators/base-query.schema';
import { validateString } from '../../core/validators/common.schema';
import { roleTypeEnum } from '../../core/database/schema/enum.schema';

export const userRoleValues = roleTypeEnum.enumValues;

const APIKEY_SORTABLE_FIELDS: readonly SortableField[] = [
	{ name: 'name', queryName: 'name' },
	{ name: 'createdAt', queryName: 'createdAt' },
	{ name: 'updatedAt', queryName: 'updatedAt' },
] as const;

export const apiKeysListQuerySchema = baseQuerySchema(APIKEY_SORTABLE_FIELDS);

export const createApiKeySchema = z
	.object({
		name: validateString('Name'),
	})
	.strict();

export const updateApiKeySchema = z
	.object({
		name: validateString('Name'),
	})
	.strict()
	.refine(data => Object.keys(data).length > 0, {
		message: 'At least one API key field must be provided',
	});

export type ApiKeysListQueryDto = z.infer<typeof apiKeysListQuerySchema>;
export type CreateApiKeyDto = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyDto = z.infer<typeof updateApiKeySchema>;
