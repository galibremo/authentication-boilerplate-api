import { pgTable, serial, text, uuid } from 'drizzle-orm/pg-core';
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
