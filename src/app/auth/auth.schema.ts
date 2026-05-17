import z from 'zod';
import {
	validateEmail,
	validateEnum,
	validatePassword,
	validatePhoneNumber,
	validateString,
} from '../../core/validators/common.schema';
import { baseQuerySchema, type SortableField } from '../../core/validators/base-query.schema';

export const sessionStatusValues = ['active', 'revoked', 'expired'] as const;
const SESSION_SORTABLE_FIELDS: readonly SortableField[] = [
	{ name: 'deviceName', queryName: 'deviceName' },
	{ name: 'deviceType', queryName: 'deviceType' },
	{ name: 'ipAddress', queryName: 'ipAddress' },
	{ name: 'userAgent', queryName: 'userAgent' },
	{ name: 'status', queryName: 'status' },
	{ name: 'createdAt', queryName: 'createdAt' },
	{ name: 'expiresAt', queryName: 'expiresAt' },
] as const;

export const loginSchema = z
	.object({
		email: validateEmail,
		password: validateString('Password'),
	})
	.strict();

export const googleLoginSchema = z
	.object({
		credential: validateString('Google credential'),
	})
	.strict();

const magicLinkRedirectSchema = z.preprocess(value => {
	if (Array.isArray(value)) return value[0];
	if (typeof value !== 'string') return undefined;

	const trimmed = value.trim();
	return trimmed || undefined;
}, validateString('Redirect URL', { max: 2048 }).optional());

export const magicLinkRequestSchema = z
	.object({
		email: validateEmail,
		redirectUrl: magicLinkRedirectSchema,
	})
	.strict();

export const magicLinkVerifySchema = z
	.object({
		email: validateEmail,
		token: validateString('Magic link token'),
		redirect: magicLinkRedirectSchema,
		redirectUrl: magicLinkRedirectSchema,
	})
	.strict();

export const registerSchema = z
	.object({
		name: validateString('Name').optional(),
		email: validateEmail,
		password: validatePassword,
		image: validateString('Image').optional(),
		phone: validatePhoneNumber('Phone').optional(),
	})
	.strict();

export const updateProfileSchema = z
	.object({
		name: validateString('Name').optional(),
		image: validateString('Image').optional(),
		phone: validatePhoneNumber('Phone').optional(),
	})
	.strict();

export const twoFactorCodeSchema = z
	.object({
		code: validateString('Two-factor code', { min: 6, max: 32 }),
	})
	.strict();

export const sessionListQuerySchema = baseQuerySchema(SESSION_SORTABLE_FIELDS).safeExtend({
	status: validateString('Status')
		.transform(val => {
			if (!val?.trim()) return [];
			return val
				.split(',')
				.map(v => v.trim())
				.filter(Boolean)
				.map(v => validateEnum('Status', sessionStatusValues).parse(v));
		})
		.optional(),
	deviceType: validateString('Device Type')
		.transform(val => {
			if (!val?.trim()) return [];
			return val
				.split(',')
				.map(v => v.trim())
				.filter(Boolean);
		})
		.optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type GoogleLoginDto = z.infer<typeof googleLoginSchema>;
export type MagicLinkRequestDto = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerifyDto = z.infer<typeof magicLinkVerifySchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type SessionListQueryDto = z.infer<typeof sessionListQuerySchema>;
export type TwoFactorCodeDto = z.infer<typeof twoFactorCodeSchema>;
