import type { KnowledgeBaseSchemaType } from '../../core/database/types';
import type { MediaResponseType } from '../media/media.types';

export type KnowledgeBaseRow = Pick<
	KnowledgeBaseSchemaType,
	'publicId' | 'systemMessage' | 'createdAt' | 'updatedAt'
>;

export type KnowledgeBaseResponse = KnowledgeBaseRow;

export type KnowledgeBaseFileResponse = Omit<MediaResponseType, 'publicId'> & {
	id: string;
};

export type KnowledgeBaseFileListResponse = {
	rows: KnowledgeBaseFileResponse[];
	total: number;
	page: number;
	pageSize: number;
};
