import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvType } from '../../core/validators/env';
import { MemorySecurityStore } from './memory-store.service';
import { PostgresSecurityStore } from './postgres-store.service';
import { RedisSecurityStore } from './redis-store.service';
import type { ISecurityStore } from './security-store.interface';

export const SECURITY_STORE_TOKEN = 'SECURITY_STORE_TOKEN';

/**
 * Dynamic module that provides the correct security store implementation
 * based on the CACHE_STORE environment variable.
 *
 * - memory: In-memory store (default, single-instance)
 * - postgres: PostgreSQL-backed store (multi-instance, no extra deps)
 * - redis: Redis-backed store (distributed, requires ioredis)
 *
 * Only the selected store is instantiated — the others are never created.
 *
 * Marked as @Global() so the SECURITY_STORE_TOKEN is available across all modules
 * without requiring explicit imports (needed for guards used in controllers).
 */
@Global()
@Module({})
export class SecurityStoreModule {
	/**
	 * Creates the security store module with the correct implementation
	 * based on the CACHE_STORE environment variable.
	 *
	 * Import this in AppModule: SecurityStoreModule.forRoot()
	 */
	static forRoot(): DynamicModule {
		return {
			module: SecurityStoreModule,
			imports: [ConfigModule],
			providers: [
				{
					provide: SECURITY_STORE_TOKEN,
					useFactory: (
						configService: ConfigService<EnvType, true>,
						memory: MemorySecurityStore,
						postgres: PostgresSecurityStore,
					): ISecurityStore => {
						const store = configService.get('CACHE_STORE', { infer: true });

						switch (store) {
							case 'postgres':
								return postgres;
							case 'redis': {
								// RedisSecurityStore is created directly here so it is
								// only instantiated when CACHE_STORE=redis. This avoids
								// throwing on startup when REDIS_URL is not configured.
								return new RedisSecurityStore(configService);
							}
							case 'memory':
							default:
								return memory;
						}
					},
					inject: [ConfigService, MemorySecurityStore, PostgresSecurityStore],
				},
				MemorySecurityStore,
				PostgresSecurityStore,
			],
			exports: [SECURITY_STORE_TOKEN],
		};
	}
}
