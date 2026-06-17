import { Inject, Injectable } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DATABASE_CONNECTION } from '../../core/database/connection';
import { orderByColumn } from '../../core/database/helpers';
import schema from '../../core/database/schema';
import type { ApiKeySchemaType } from '../../core/database/types';
import type { ApiKeysRow } from './api-keys.types';
import type { ApiKeysListQueryDto } from './api-keys.schema';

export type ApiKeysDatabase = NodePgDatabase<typeof schema>;

@Injectable()
export class ApiKeysRepository {
	constructor(
		@Inject(DATABASE_CONNECTION)
		private readonly db: ApiKeysDatabase,
	) {}

	findApiKeyByPublicId(publicId: string, userId: number): Promise<ApiKeySchemaType | undefined> {
		return this.db.query.apiKeys.findFirst({
			where: and(eq(schema.apiKeys.publicId, publicId), eq(schema.apiKeys.userId, userId)),
		});
	}

	async listApiKeys(query: ApiKeysListQueryDto, userId: number): Promise<{
		rows: ApiKeysRow[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const now = new Date();
		const whereClause = this.getListApiKeysWhere(query, userId);
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 10;
		const offset = (page - 1) * pageSize;
		const activeSessionCount = this.activeSessionCountSql(now);
		const orderBy = this.getApiKeysOrderBy(query.sort, query.dir, activeSessionCount);

		const [rows, totalRows] = await Promise.all([
			this.db
				.select(this.apiKeysSelection())
				.from(schema.apiKeys)
				.where(whereClause)
				.groupBy(
					schema.apiKeys.id,
					schema.apiKeys.publicId,
					schema.apiKeys.name,
					schema.apiKeys.key,
					schema.apiKeys.createdAt,
					schema.apiKeys.updatedAt,
				)
				.orderBy(orderBy ?? desc(schema.apiKeys.createdAt))
				.limit(pageSize)
				.offset(offset),
			this.db.select({ value: count() }).from(schema.apiKeys).where(whereClause),
		]);

		return {
			rows,
			total: Number(totalRows[0]?.value ?? 0),
			page,
			pageSize,
		};
	}

	async createApiKey(
		data: typeof schema.apiKeys.$inferInsert,
	): Promise<ApiKeySchemaType | undefined> {
		return this.db
			.insert(schema.apiKeys)
			.values(data)
			.returning()
			.then(rows => rows[0]);
	}

	async findApiKeyById(apiKeyId: number, userId: number): Promise<ApiKeysRow | undefined> {
		return this.db
			.select(this.apiKeysSelection())
			.from(schema.apiKeys)
			.where(and(eq(schema.apiKeys.id, apiKeyId), eq(schema.apiKeys.userId, userId)))
			.groupBy(
				schema.apiKeys.id,
				schema.apiKeys.publicId,
				schema.apiKeys.name,
				schema.apiKeys.key,
				schema.apiKeys.createdAt,
				schema.apiKeys.updatedAt,
			)
			.then(rows => rows[0]);
	}

	async updateApiKey(
		apiKeyId: number,
		data: Partial<typeof schema.apiKeys.$inferInsert>,
	): Promise<ApiKeySchemaType | undefined> {
		return this.db
			.update(schema.apiKeys)
			.set(data)
			.where(eq(schema.apiKeys.id, apiKeyId))
			.returning()
			.then(rows => rows[0]);
	}

	async deleteApiKey(apiKeyId: number): Promise<ApiKeySchemaType | undefined> {
		return this.db
			.delete(schema.apiKeys)
			.where(eq(schema.apiKeys.id, apiKeyId))
			.returning()
			.then(rows => rows[0]);
	}

	private getListApiKeysWhere(query: ApiKeysListQueryDto, userId: number): SQL<unknown> {
		const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
		const toDate = query.toDate ? new Date(query.toDate) : undefined;

		if (toDate) {
			toDate.setHours(23, 59, 59, 999);
		}

		const q = query.search ? `%${query.search}%` : undefined;
		const searchExists = q ? ilike(schema.apiKeys.name, q) : undefined;

		const conditions = [
			eq(schema.apiKeys.userId, userId),
			searchExists,
			fromDate ? gte(schema.apiKeys.createdAt, fromDate) : undefined,
			toDate ? lte(schema.apiKeys.createdAt, toDate) : undefined,
		].filter(Boolean) as SQL<unknown>[];

		return and(...conditions)!;
	}

	private getApiKeysOrderBy(
		sort: string | undefined,
		dir: 'asc' | 'desc' | undefined,
		activeSessionCount: SQL<number>,
	): SQL<unknown> | undefined {
		const direction = dir ?? 'desc';

		if (sort === 'activeSessionCount') {
			return direction === 'desc' ? desc(activeSessionCount) : asc(activeSessionCount);
		}

		return orderByColumn(schema.apiKeys, sort, direction);
	}

	private activeSessionCountSql(now: Date): SQL<number> {
		return sql<number>`COALESCE(COUNT(${schema.sessions.id}) FILTER (WHERE ${schema.sessions.isRevoked} = false AND ${schema.sessions.expiresAt} > ${now}), 0)::int`;
	}

	private apiKeysSelection() {
		return {
			id: schema.apiKeys.id,
			publicId: schema.apiKeys.publicId,
			name: schema.apiKeys.name,
			key: schema.apiKeys.key,
			createdAt: schema.apiKeys.createdAt,
			updatedAt: schema.apiKeys.updatedAt,
		};
	}

	async findApiKeyManagementRowById(apiKeyId: number): Promise<ApiKeysRow | undefined> {
		return this.db
			.select(this.apiKeysSelection())
			.from(schema.apiKeys)
			.where(eq(schema.apiKeys.id, apiKeyId))
			.groupBy(
				schema.apiKeys.id,
				schema.apiKeys.publicId,
				schema.apiKeys.name,
				schema.apiKeys.key,
				schema.apiKeys.createdAt,
				schema.apiKeys.updatedAt,
			)
			.then(rows => rows[0]);
	}
}
