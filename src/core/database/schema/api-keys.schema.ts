import { integer, pgTable, serial, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../helpers';
import { users } from './auth.schema';

export const apiKeys = pgTable('api_keys', {
	id: serial('id').primaryKey(),
	publicId: uuid('public_id').defaultRandom().notNull().unique(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name'),
	key: text('key').notNull(),
	...timestamps,
});
