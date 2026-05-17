import { z } from 'zod';

import {
	validateEmail,
	validateEnum,
	validatePassword,
	validatePhoneNumber,
	validateString,
} from '../../core/validators/common.schema';
import { baseQuerySchema, type SortableField } from '../../core/validators/base-query.schema';
import { roleTypeEnum } from '../../models/drizzle/enum.model';

export const userRoleValues = roleTypeEnum.enumValues;

const USER_SORTABLE_FIELDS: readonly SortableField[] = [
	{ name: 'name', queryName: 'name' },
	{ name: 'email', queryName: 'email' },
	{ name: 'emailVerified', queryName: 'emailVerified' },
	{ name: 'is2faEnabled', queryName: 'is2faEnabled' },
	{ name: 'role', queryName: 'role' },
	{ name: 'activeSessionCount', queryName: 'activeSessionCount' },
	{ name: 'createdAt', queryName: 'createdAt' },
	{ name: 'updatedAt', queryName: 'updatedAt' },
] as const;

const roleQuerySchema = validateString('Role')
	.transform(value =>
		value
			.split(',')
			.map(role => role.trim())
			.filter(Boolean),
	)
	.refine(
		values => values.every(role => userRoleValues.includes(role as (typeof userRoleValues)[number])),
		{ error: 'Role is invalid' },
	)
	.transform(values => values as (typeof userRoleValues)[number][])
	.optional();

const emailVerifiedQuerySchema = z
	.preprocess(value => {
		const rawValue = Array.isArray(value) ? value[0] : value;
		if (typeof rawValue !== 'string') return undefined;

		const normalized = rawValue.trim().toLowerCase();
		return normalized || undefined;
	}, z.enum(['true', 'false'], { error: 'Email Verified must be true or false' }).optional())
	.transform(value => (value === undefined ? undefined : value === 'true'));

export const usersListQuerySchema = baseQuerySchema(USER_SORTABLE_FIELDS).safeExtend({
	role: roleQuerySchema,
	emailVerified: emailVerifiedQuerySchema,
});

export const updateUserRoleSchema = z
	.object({
		role: validateEnum('Role', userRoleValues),
	})
	.strict();

const optionalNullableString = (name: string, max = 255) =>
	z
		.preprocess(value => {
			if (value === null) return null;
			if (typeof value !== 'string') return undefined;

			const trimmed = value.trim();
			return trimmed || null;
		}, validateString(name, { max }).nullable().optional());

const optionalNullablePhone = z.preprocess(value => {
	if (value === null) return null;
	if (typeof value !== 'string') return undefined;

	const trimmed = value.trim();
	return trimmed || null;
}, validatePhoneNumber('Phone').nullable().optional());

const optionalNullablePassword = z.preprocess(value => {
	if (value === null) return null;
	if (typeof value !== 'string') return undefined;

	const trimmed = value.trim();
	return trimmed || null;
}, validatePassword.nullable().optional());

export const createUserSchema = z
	.object({
		name: optionalNullableString('Name'),
		email: validateEmail.transform(value => value.toLowerCase()),
		password: optionalNullablePassword,
		phone: optionalNullablePhone,
		emailVerified: z.boolean({ error: 'Email Verified is required' }).optional(),
		role: validateEnum('Role', userRoleValues),
	})
	.strict();

export const updateUserSchema = z
	.object({
		name: optionalNullableString('Name'),
		email: validateEmail.transform(value => value.toLowerCase()).optional(),
		phone: optionalNullablePhone,
		emailVerified: z.boolean({ error: 'Email Verified is required' }).optional(),
	})
	.strict()
	.refine(data => Object.keys(data).length > 0, {
		error: 'At least one user field must be provided',
	});

export type UsersListQueryDto = z.infer<typeof usersListQuerySchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;
