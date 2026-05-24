import {
	boolean,
	index,
	integer,
	pgTable,
	serial,
	text,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

import { timestamps } from '../../database/helpers';

export const emailTemplates = pgTable(
	'email_templates',
	{
		id: serial('id').primaryKey(),
		publicId: uuid('public_id').defaultRandom().notNull().unique(),
		key: varchar('key', { length: 120 }).notNull(),
		subject: text('subject').notNull(),
		html: text('html').notNull(),
		text: text('text'),
		version: integer('version').default(1).notNull(),
		isActive: boolean('is_active').default(true).notNull(),
		...timestamps,
	},
	table => [
		uniqueIndex('email_templates_public_id_idx').on(table.publicId),
		uniqueIndex('email_templates_key_version_idx').on(table.key, table.version),
		index('email_templates_key_is_active_version_idx').on(table.key, table.isActive, table.version),
	],
);
