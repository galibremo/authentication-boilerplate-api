import { Inject, Injectable } from '@nestjs/common';

import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DATABASE_CONNECTION } from '../../core/database/connection';
import schema from '../../core/database/schema';
import type {
	KnowledgeBaseCollectionSchemaType,
	KnowledgeBaseSchemaType,
} from '../../core/database/types';
import type { KnowledgeBaseRow } from './knowledge-base.types';

export type KnowledgeBaseDatabase = NodePgDatabase<typeof schema>;

@Injectable()
export class KnowledgeBaseRepository {
	constructor(
		@Inject(DATABASE_CONNECTION)
		private readonly db: KnowledgeBaseDatabase,
	) {}

	async createOrUpdateKnowledgeBaseMessage(
		data: typeof schema.knowledgeBase.$inferInsert,
	): Promise<KnowledgeBaseSchemaType | undefined> {
		return this.db
			.insert(schema.knowledgeBase)
			.values(data)
			.onConflictDoUpdate({
				target: schema.knowledgeBase.owner,
				set: {
					systemMessage: data.systemMessage,
				},
			})
			.returning()
			.then(rows => rows[0]);
	}

	async findKnowledgeBaseMessageByUserId(userId: number): Promise<KnowledgeBaseRow | undefined> {
		return this.db
			.select(this.knowledgeBaseSelection())
			.from(schema.knowledgeBase)
			.where(eq(schema.knowledgeBase.owner, userId))
			.then(rows => rows[0]);
	}

	async findCollectionByUserId(
		userId: number,
	): Promise<KnowledgeBaseCollectionSchemaType | undefined> {
		return this.db
			.select()
			.from(schema.knowledgeBaseCollections)
			.where(eq(schema.knowledgeBaseCollections.owner, userId))
			.then(rows => rows[0]);
	}

	async createCollection(
		data: typeof schema.knowledgeBaseCollections.$inferInsert,
	): Promise<KnowledgeBaseCollectionSchemaType | undefined> {
		return this.db
			.insert(schema.knowledgeBaseCollections)
			.values(data)
			.onConflictDoNothing()
			.returning()
			.then(rows => rows[0]);
	}

	private knowledgeBaseSelection() {
		return {
			publicId: schema.knowledgeBase.publicId,
			systemMessage: schema.knowledgeBase.systemMessage,
			createdAt: schema.knowledgeBase.createdAt,
			updatedAt: schema.knowledgeBase.updatedAt,
		};
	}
}
