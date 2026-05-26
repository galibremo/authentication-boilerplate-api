import type { InferSelectModel } from 'drizzle-orm';
import {
	accounts,
	sessions,
	twoFactorRecoveryCodes,
	twoFactorSetups,
	users,
} from '../models/drizzle/auth.model';
import { auditLogs } from '../models/drizzle/audit-log.model';
import { emailTemplates } from '../models/drizzle/email-template.model';
import { roleTypeEnum } from '../models/drizzle/enum.model';
import { media } from '../models/drizzle/media.model';
import { securityCache } from '../models/drizzle/security-store.model';
import { emailLogs } from '../models/drizzle/email-log.model';
import { smtpProviders } from '../models/drizzle/smtp-provider.model';
import { systemSettings } from '../models/drizzle/system.model';

/**
 * Schema Types
 */
export type UserSchemaType = InferSelectModel<typeof users>;
export type AccountSchemaType = InferSelectModel<typeof accounts>;
export type SessionSchemaType = InferSelectModel<typeof sessions>;
export type TwoFactorSetupSchemaType = InferSelectModel<typeof twoFactorSetups>;
export type TwoFactorRecoveryCodeSchemaType = InferSelectModel<typeof twoFactorRecoveryCodes>;
export type AuditLogSchemaType = InferSelectModel<typeof auditLogs>;
export type MediaSchemaType = InferSelectModel<typeof media>;
export type EmailTemplateSchemaType = InferSelectModel<typeof emailTemplates>;
export type SystemSettingsSchemaType = InferSelectModel<typeof systemSettings>;
export type SecurityCacheSchemaType = InferSelectModel<typeof securityCache>;
export type SmtpProviderSchemaType = InferSelectModel<typeof smtpProviders>;
export type EmailLogSchemaType = InferSelectModel<typeof emailLogs>;

/**
 * Enum Schema Types
 */
export type RoleTypeEnum = (typeof roleTypeEnum.enumValues)[number];
