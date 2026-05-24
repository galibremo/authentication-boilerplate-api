import { z } from 'zod';
import { validateEnum, validateString } from './common.schema';

const allSecretsEnvSchema = z.object({
	AUTH_SECRET: validateString('AUTH_SECRET'),
	CSRF_SECRET: validateString('CSRF_SECRET'),
	CRYPTO_SECRET: validateString('CRYPTO_SECRET'),
});

export const cookieEnvSchema = z.object({
	COOKIE_DOMAIN: validateString('COOKIE_DOMAIN'),
	COOKIE_SAME_SITE: validateEnum('COOKIE_SAME_SITE', ['strict', 'lax', 'none']).default('lax'),
	COOKIE_SECURE: validateEnum('COOKIE_SECURE', ['true', 'false']).default('false'),
});

const coreEnvSchema = z.object({
	DATABASE_URL: validateString('DATABASE_URL'),
	PORT: validateString('PORT').refine(value => !isNaN(Number(value)), 'PORT must be a number'),
	NODE_ENV: validateEnum('NODE_ENV', ['development', 'production']).default('development'),
	ORIGIN_URL: validateString('ORIGIN_URL'),
	API_URL: validateString('API_URL'),
	APP_URL: validateString('APP_URL'),
});

const integrationFlagsSchema = z.object({
	GOOGLE_LOGIN_ENABLED: validateEnum('GOOGLE_LOGIN_ENABLED', ['true', 'false']).default('false'),
	CLOUDINARY_ENABLED: validateEnum('CLOUDINARY_ENABLED', ['true', 'false']).default('false'),
	BREVO_ENABLED: validateEnum('BREVO_ENABLED', ['true', 'false']).default('false'),
});

const integrationCredentialsSchema = z.object({
	GOOGLE_CLIENT_ID: validateString('GOOGLE_CLIENT_ID').optional(),

	CLOUDINARY_CLOUD_NAME: validateString('CLOUDINARY_CLOUD_NAME').optional(),
	CLOUDINARY_API_KEY: validateString('CLOUDINARY_API_KEY').optional(),
	CLOUDINARY_API_SECRET: validateString('CLOUDINARY_API_SECRET').optional(),

	BREVO_API_KEY: validateString('BREVO_API_KEY').optional(),
	BREVO_SENDER_EMAIL: validateString('BREVO_SENDER_EMAIL').optional(),
	BREVO_SENDER_NAME: validateString('BREVO_SENDER_NAME').optional(),
});

const healthCheckSchema = z.object({
	HEALTH_HEAP_LIMIT_MB: validateString('HEALTH_HEAP_LIMIT_MB')
		.refine(value => !isNaN(Number(value)), 'HEALTH_HEAP_LIMIT_MB must be a number')
		.transform(value => Number(value))
		.default(150),
	HEALTH_RSS_LIMIT_MB: validateString('HEALTH_RSS_LIMIT_MB')
		.refine(value => !isNaN(Number(value)), 'HEALTH_RSS_LIMIT_MB must be a number')
		.transform(value => Number(value))
		.default(300),
});

const securityStoreSchema = z.object({
	CACHE_STORE: validateEnum('CACHE_STORE', ['memory', 'postgres', 'redis']).default('memory'),
	REDIS_URL: validateString('REDIS_URL').optional(),
});

const rateLimitSchema = z.object({
	RATE_LIMIT_TTL_SECONDS: validateString('RATE_LIMIT_TTL_SECONDS')
		.refine(value => !isNaN(Number(value)), 'RATE_LIMIT_TTL_SECONDS must be a number')
		.transform(value => Number(value))
		.default(60),
	RATE_LIMIT_MAX_REQUESTS: validateString('RATE_LIMIT_MAX_REQUESTS')
		.refine(value => !isNaN(Number(value)), 'RATE_LIMIT_MAX_REQUESTS must be a number')
		.transform(value => Number(value))
		.default(100),
});

const bruteForceSchema = z.object({
	LOGIN_MAX_FAILED_ATTEMPTS: validateString('LOGIN_MAX_FAILED_ATTEMPTS')
		.refine(value => !isNaN(Number(value)), 'LOGIN_MAX_FAILED_ATTEMPTS must be a number')
		.transform(value => Number(value))
		.default(5),
	LOGIN_LOCKOUT_MINUTES: validateString('LOGIN_LOCKOUT_MINUTES')
		.refine(value => !isNaN(Number(value)), 'LOGIN_LOCKOUT_MINUTES must be a number')
		.transform(value => Number(value))
		.default(15),
});

const passwordPolicySchema = z.object({
	PASSWORD_MIN_LENGTH: validateString('PASSWORD_MIN_LENGTH')
		.refine(value => !isNaN(Number(value)), 'PASSWORD_MIN_LENGTH must be a number')
		.transform(value => Number(value))
		.default(8),
});

const securityHeadersSchema = z.object({
	HELMET_ENABLED: validateEnum('HELMET_ENABLED', ['true', 'false']).default('true'),
	CSP_POLICY: validateString('CSP_POLICY').optional(),
});

export const envSchema = z
	.object({
		...coreEnvSchema.shape,
		...cookieEnvSchema.shape,
		...allSecretsEnvSchema.shape,
		...integrationFlagsSchema.shape,
		...integrationCredentialsSchema.shape,
		...healthCheckSchema.shape,
		...securityStoreSchema.shape,
		...rateLimitSchema.shape,
		...bruteForceSchema.shape,
		...passwordPolicySchema.shape,
		...securityHeadersSchema.shape,
	})
	.superRefine((data, ctx) => {
		if (data.CACHE_STORE === 'redis' && !data.REDIS_URL) {
			ctx.addIssue({
				code: 'custom',
				message: 'REDIS_URL is required when CACHE_STORE is redis',
				path: ['REDIS_URL'],
			});
		}

		if (data.GOOGLE_LOGIN_ENABLED === 'true' && !data.GOOGLE_CLIENT_ID) {
			ctx.addIssue({
				code: 'custom',
				message: 'GOOGLE_CLIENT_ID is required when GOOGLE_LOGIN_ENABLED is true',
				path: ['GOOGLE_CLIENT_ID'],
			});
		}

		if (data.CLOUDINARY_ENABLED === 'true') {
			if (!data.CLOUDINARY_CLOUD_NAME) {
				ctx.addIssue({
					code: 'custom',
					message: 'CLOUDINARY_CLOUD_NAME is required when CLOUDINARY_ENABLED is true',
					path: ['CLOUDINARY_CLOUD_NAME'],
				});
			}
			if (!data.CLOUDINARY_API_KEY) {
				ctx.addIssue({
					code: 'custom',
					message: 'CLOUDINARY_API_KEY is required when CLOUDINARY_ENABLED is true',
					path: ['CLOUDINARY_API_KEY'],
				});
			}
			if (!data.CLOUDINARY_API_SECRET) {
				ctx.addIssue({
					code: 'custom',
					message: 'CLOUDINARY_API_SECRET is required when CLOUDINARY_ENABLED is true',
					path: ['CLOUDINARY_API_SECRET'],
				});
			}
		}

		if (data.BREVO_ENABLED === 'true') {
			if (!data.BREVO_API_KEY) {
				ctx.addIssue({
					code: 'custom',
					message: 'BREVO_API_KEY is required when BREVO_ENABLED is true',
					path: ['BREVO_API_KEY'],
				});
			}
			if (!data.BREVO_SENDER_EMAIL) {
				ctx.addIssue({
					code: 'custom',
					message: 'BREVO_SENDER_EMAIL is required when BREVO_ENABLED is true',
					path: ['BREVO_SENDER_EMAIL'],
				});
			}
			if (!data.BREVO_SENDER_NAME) {
				ctx.addIssue({
					code: 'custom',
					message: 'BREVO_SENDER_NAME is required when BREVO_ENABLED is true',
					path: ['BREVO_SENDER_NAME'],
				});
			}
		}
	});

export type EnvType = z.infer<typeof envSchema>;

// NestJS ConfigModule validation function
export function validateEnv(config: Record<string, unknown>): EnvType {
	const result = envSchema.safeParse(config);

	if (!result.success) {
		const errorMessages = result.error.issues.map(e => e.message).join('\n');
		console.error(`\x1b[31mEnvironment validation failed:\n${errorMessages}\x1b[0m`);
		throw new Error('Environment validation failed');
	}

	return result.data;
}
