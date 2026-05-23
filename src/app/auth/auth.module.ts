import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { sessionTimeout } from '../../core/helpers/constant.helpers';
import { EnvType } from '../../core/validators/env';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { BrevoModule } from '../brevo/brevo.module';
import { SystemModule } from '../system/system.module';
import { AUTH_CLOUDINARY_SERVICE, authCloudinaryProvider } from './core/auth.providers';
import { AuthRepository } from './core/auth.repository';
import { AuthService } from './core/auth.service';
import { SessionRepository } from './session/session.repository';
import { SessionService } from './session/session.service';
import { TwoFactorRepository } from './two-factor/two-factor.repository';
import { TwoFactorService } from './two-factor/two-factor.service';
import { ApprovalEmailService } from './services/approval-email.service';
import { InvitationEmailService } from './services/invitation-email.service';
import { MagicLinkEmailService } from './services/magic-link-email.service';
import { TwoFactorAlertEmailService } from './services/two-factor-alert-email.service';
import { WelcomeEmailService } from './services/welcome-email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtPartialStrategy } from './strategies/jwt-partial.strategy';
import { AuthController } from './auth.controller';

@Module({
	imports: [
		PassportModule,
		AuditLogModule,
		BrevoModule,
		SystemModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService<EnvType>) => ({
				secret: configService.get('AUTH_SECRET', { infer: true }),
				signOptions: { expiresIn: sessionTimeout / 1000 }, // Convert ms to seconds
			}),
		}),
	],
	providers: [
		AuthService,
		AuthRepository,
		JwtStrategy,
		JwtPartialStrategy,
		SessionService,
		SessionRepository,
		TwoFactorService,
		TwoFactorRepository,
		ApprovalEmailService,
		InvitationEmailService,
		MagicLinkEmailService,
		TwoFactorAlertEmailService,
		WelcomeEmailService,
		authCloudinaryProvider,
	],
	controllers: [AuthController],
	exports: [
		AuthService,
		TwoFactorService,
		ApprovalEmailService,
		InvitationEmailService,
		TwoFactorAlertEmailService,
		AUTH_CLOUDINARY_SERVICE,
	],
})
export class AuthModule {}
