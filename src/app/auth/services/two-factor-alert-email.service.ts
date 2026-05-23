import { Injectable, Logger } from '@nestjs/common';

import { BrevoService } from '../../brevo/brevo.service';

export type TwoFactorAlertEvent = 'enabled' | 'disabled' | 'reset';

interface SendTwoFactorAlertEmailParams {
	email: string;
	name?: string | null;
	event: TwoFactorAlertEvent;
	ipAddress?: string | null;
	userAgent?: string | null;
}

const twoFactorAlertTemplateKey = 'auth_two_factor_alert';

const eventLabels: Record<TwoFactorAlertEvent, string> = {
	enabled: 'enabled',
	disabled: 'disabled',
	reset: 'reset by an administrator',
};

@Injectable()
export class TwoFactorAlertEmailService {
	private readonly logger = new Logger(TwoFactorAlertEmailService.name);

	constructor(private readonly brevoService: BrevoService) {}

	async sendTwoFactorAlertEmail(params: SendTwoFactorAlertEmailParams): Promise<void> {
		try {
			await this.brevoService.sendFromTemplate({
				templateKey: twoFactorAlertTemplateKey,
				to: [{ email: params.email, name: params.name ?? undefined }],
				params: {
					name: params.name ?? 'there',
					event: params.event,
					eventLabel: eventLabels[params.event],
					ipAddress: params.ipAddress ?? 'Unknown',
					userAgent: params.userAgent ?? 'Unknown',
					year: new Date().getFullYear(),
				},
			});
		} catch (error) {
			this.logger.warn(`Failed to send two-factor alert email: ${this.getErrorMessage(error)}`);
		}
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : 'Unknown error';
	}
}
