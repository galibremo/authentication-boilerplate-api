import { jsonb, varchar } from 'drizzle-orm/pg-core';
import { serial } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

export const n8NChatHistories = pgTable('n8n_chat_histories', {
	id: serial().primaryKey().notNull(),
	sessionId: varchar('session_id', { length: 255 }).notNull(),
	message: jsonb().notNull(),
});
