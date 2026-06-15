import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DATABASE_CONNECTION } from '../../core/database/connection';
import schema from '../../core/database/schema';

export type N8NDatabase = NodePgDatabase<typeof schema>;

@Injectable()
export class N8NRepository {
	constructor(
		@Inject(DATABASE_CONNECTION)
		private readonly db: N8NDatabase,
	) {}

	async findBySessionId(
		sessionId: string,
	): Promise<{ id: number; sessionId: string; message: unknown }[]> {
		return this.db
			.select({
				id: schema.n8NChatHistories.id,
				sessionId: schema.n8NChatHistories.sessionId,
				message: schema.n8NChatHistories.message,
			})
			.from(schema.n8NChatHistories)
			.where(
				and(
					eq(schema.n8NChatHistories.sessionId, sessionId),
					sql`(
						${schema.n8NChatHistories.message}->>'type' = 'human'
						OR (
							${schema.n8NChatHistories.message}->>'type' = 'ai'
							AND jsonb_array_length(${schema.n8NChatHistories.message}->'tool_calls') = 0
						)
					)`,
				),
			)
			.orderBy(asc(schema.n8NChatHistories.id));
	}
}
