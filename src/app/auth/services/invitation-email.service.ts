import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvType } from '../../../core/validators/env';
import type { RoleTypeEnum } from '../../../database/types';
import { TEMPLATE_KEYS } from '../../email-template/email-template.registry';
import { EmailDispatcherService } from '../../smtp/email-dispatcher.service';

interface SendInvitationEmailParams {
	email: string;
	name?: string | null;
	role: RoleTypeEnum;
	createdByName?: string | null;
}

@Injectable()
export class InvitationEmailService {
	private readonly logger = new Logger(InvitationEmailService.name);

	constructor(
		private readonly emailDispatcher: EmailDispatcherService,
		private readonly configService: ConfigService<EnvType, true>,
	) {}

	async sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
		try {
			const appUrl = this.configService.get('APP_URL', { infer: true });

			await this.emailDispatcher.sendFromTemplate({
				templateKey: TEMPLATE_KEYS.AUTH_INVITATION,
				to: [{ email: params.email, name: params.name ?? undefined }],
				params: {
					name: params.name ?? 'there',
					role: params.role,
					createdByName: params.createdByName ?? 'an administrator',
					appUrl,
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
