import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RoleTypeEnum } from '../../../database/types';
import type { EnvType } from '../../../core/validators/env';
import { BrevoService } from '../../brevo/brevo.service';

interface SendInvitationEmailParams {
	email: string;
	name?: string | null;
	role: RoleTypeEnum;
	createdByName?: string | null;
}

const invitationTemplateKey = 'auth_invitation';

@Injectable()
export class InvitationEmailService {
	private readonly logger = new Logger(InvitationEmailService.name);

	constructor(
		private readonly brevoService: BrevoService,
		private readonly configService: ConfigService<EnvType, true>,
	) {}

	async sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
		try {
			await this.brevoService.sendFromTemplate({
				templateKey: invitationTemplateKey,
				to: [{ email: params.email, name: params.name ?? undefined }],
				params: {
					name: params.name ?? 'there',
					role: params.role,
					createdByName: params.createdByName ?? 'an administrator',
					appUrl: this.configService.get('APP_URL', { infer: true }),
					year: new Date().getFullYear(),
				},
			});
		} catch (error) {
			this.logger.warn(`Failed to send invitation email: ${this.getErrorMessage(error)}`);
		}
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : 'Unknown error';
	}
}
