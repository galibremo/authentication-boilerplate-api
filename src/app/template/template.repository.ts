import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DATABASE_CONNECTION } from '../../database/connection';
import schema from '../../database/schema';
import type { EmailTemplateSchemaType } from '../../database/types';

export type TemplateDatabase = NodePgDatabase<typeof schema>;

@Injectable()
export class TemplateRepository {
	constructor(
		@Inject(DATABASE_CONNECTION)
		private readonly db: TemplateDatabase,
	) {}

	async findActiveByKey(templateKey: string): Promise<EmailTemplateSchemaType | null> {
		return this.db
			.select()
			.from(schema.emailTemplates)
			.where(
				and(eq(schema.emailTemplates.key, templateKey), eq(schema.emailTemplates.isActive, true)),
			)
			.orderBy(desc(schema.emailTemplates.version))
			.limit(1)
			.then(rows => rows[0] ?? null);
	}
}
