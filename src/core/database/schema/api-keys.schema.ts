import { pgTable, serial, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../helpers';

export const apiKeys = pgTable('api_keys', {
	id: serial('id').primaryKey(),
	publicId: uuid('public_id').defaultRandom().notNull().unique(),
	name: text('name'),
	key: text('key').notNull(),
	...timestamps,
});
