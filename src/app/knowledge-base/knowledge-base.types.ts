import type { KnowledgeBaseSchemaType } from '../../core/database/types';

export type KnowledgeBaseRow = Pick<
	KnowledgeBaseSchemaType,
	'publicId' | 'systemMessage' | 'createdAt' | 'updatedAt'
>;

export type KnowledgeBaseResponse = KnowledgeBaseRow;
