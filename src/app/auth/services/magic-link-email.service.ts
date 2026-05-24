import { Injectable } from '@nestjs/common';

import { badGatewayError } from '../../../core/errors/domain-error';
import { magicLinkTimeout } from '../../../core/helpers/constant.helper';
import { BrevoService } from '../../brevo/brevo.service';

interface SendMagicLinkEmailParams {
	email: string;
	verificationUrl: string;
	redirectUrl: string;
}

const magicLinkTemplateKey = 'auth_magic_link';
const minuteMs = 1000 * 60;

@Injectable()
export class MagicLinkEmailService {
	constructor(private readonly brevoService: BrevoService) {}

	async sendMagicLinkEmail(params: SendMagicLinkEmailParams): Promise<void> {
		try {
			await this.brevoService.sendFromTemplate({
				templateKey: magicLinkTemplateKey,
				to: [{ email: params.email }],
				params: {
					verificationUrl: params.verificationUrl,
					redirectUrl: params.redirectUrl,
					expiresInMinutes: Math.floor(magicLinkTimeout / minuteMs),
					year: new Date().getFullYear(),
				},
			});
		} catch {
			throw badGatewayError('magic_link_email_failed', 'Failed to send magic link email');
		}
	}
}
