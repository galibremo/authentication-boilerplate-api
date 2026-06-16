import { index, pgTable, serial, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../helpers';
import { integer } from 'drizzle-orm/pg-core';
import { users } from './auth.schema';

export const knowledgeBase = pgTable('knowledge_bases', {
	id: serial('id').primaryKey(),
	publicId: uuid('public_id').defaultRandom().notNull().unique(),
	systemMessage: text('system_message').notNull(),
	owner: integer('owner')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	...timestamps,
});

export const knowledgeBaseCollections = pgTable(
	'knowledge_base_collections',
	{
		id: serial('id').primaryKey(),
		publicId: uuid('public_id').defaultRandom().notNull().unique(),
		owner: integer('owner')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		collectionName: text('collection_name').notNull().unique(),
		displayNameSnapshot: text('display_name_snapshot'),
		...timestamps,
	},
	table => [
		uniqueIndex('knowledge_base_collections_public_id_idx').on(table.publicId),
		uniqueIndex('knowledge_base_collections_owner_idx').on(table.owner),
		uniqueIndex('knowledge_base_collections_name_idx').on(table.collectionName),
		index('knowledge_base_collections_created_at_idx').on(table.createdAt),
	],
);
