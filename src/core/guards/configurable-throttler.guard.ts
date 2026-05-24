import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { EnvType } from '../../core/validators/env';
import { SECURITY_STORE_TOKEN, type ISecurityStore } from '../security-store';

/**
 * Metadata key for skipping throttling on a route.
 * Mirrors @nestjs/throttler's @SkipThrottle() decorator behavior.
 */
const SKIP_THROTTLE_KEY = 'skipThrottle';

/**
 * Metadata key for per-route throttle limits.
 * Mirrors @nestjs/throttler's @Throttle() decorator behavior.
 */
const THROTTLE_KEY = 'throttle';

interface ThrottleLimit {
	limit: number;
	ttl: number;
}

/**
 * Configurable rate limiting guard that uses the security store
 * (memory, postgres, or redis) instead of in-memory storage.
 *
 * Works correctly in multi-instance deployments when CACHE_STORE=postgres or redis.
 *
 * Respects @nestjs/throttler decorators:
 * - @SkipThrottle() — bypasses rate limiting
 * - @Throttle({ short: { limit, ttl }, long: { limit, ttl } }) — per-route limits
 *
 * Falls back to global defaults from environment variables when no decorator is present.
 */
@Injectable()
export class ConfigurableThrottlerGuard implements CanActivate {
	private readonly logger = new Logger(ConfigurableThrottlerGuard.name);

	constructor(
		@Inject(SECURITY_STORE_TOKEN)
		private readonly store: ISecurityStore,
		private readonly configService: ConfigService<EnvType, true>,
		private readonly reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const handler = context.getHandler();
		const controller = context.getClass();

		// Check for @SkipThrottle() decorator
		const skipThrottle = this.reflector.getAllAndOverride<boolean>(SKIP_THROTTLE_KEY, [
			handler,
			controller,
		]);
		if (skipThrottle) {
			return true;
		}

		// Get per-handler limits from @Throttle() decorator
		const throttleLimits = this.reflector.getAllAndOverride<Record<string, ThrottleLimit>>(
			THROTTLE_KEY,
			[handler, controller],
		);

		// Resolve the effective limit and TTL
		const { limit, ttl } = this.resolveLimits(throttleLimits);

		// Extract client IP
		const ip = this.extractIp(request);
		if (!ip) {
			this.logger.warn('Could not extract client IP, allowing request');
			return true;
		}

		// Build rate limit key: ratelimit:{ip}:{path}
		const key = `${ip}:${request.path}`;

		try {
			const count = await this.store.increment(key, ttl);

			if (count > limit) {
				this.logger.warn(`Rate limit exceeded for IP ${ip} on ${request.path}: ${count}/${limit}`);
				return false;
			}

			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Security store error during rate limiting: ${message}`);
			// Fail open: allow the request if the store is unavailable
			return true;
		}
	}

	/**
	 * Resolve the effective rate limit and TTL from decorator metadata or global defaults.
	 */
	private resolveLimits(limits?: Record<string, ThrottleLimit>): { limit: number; ttl: number } {
		if (limits && Object.keys(limits).length > 0) {
			// Use the most restrictive limit (highest requests-per-second ratio)
			const entries = Object.values(limits);
			return entries.reduce((best, current) => {
				const bestRatio = best.limit / best.ttl;
				const currentRatio = current.limit / current.ttl;
				return currentRatio > bestRatio ? current : best;
			});
		}

		// Fall back to global defaults from environment variables
		const ttlSeconds = this.configService.get('RATE_LIMIT_TTL_SECONDS', { infer: true });
		const maxRequests = this.configService.get('RATE_LIMIT_MAX_REQUESTS', { infer: true });

		return {
			limit: maxRequests,
			ttl: ttlSeconds * 1000, // Convert seconds to milliseconds
		};
	}

	/**
	 * Extract the client IP address from the request, respecting proxy headers.
	 */
	private extractIp(req: Request): string {
		const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
		const realIp = req.headers['x-real-ip'] as string | undefined;

		if (forwardedFor) {
			// x-forwarded-for can be a comma-separated list; take the first (client) IP
			return forwardedFor.split(',')[0].trim();
		}

		if (realIp) {
			return realIp.trim();
		}

		// Fall back to Express's ip property or connection remoteAddress
		const rawIp = req.ip || req.connection?.remoteAddress || '';
		return typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : String(rawIp);
	}
}
