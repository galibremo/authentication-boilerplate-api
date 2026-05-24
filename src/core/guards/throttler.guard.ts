import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
	protected override async getTracker(req: Request): Promise<string> {
		const rawIp =
			(req.headers['x-forwarded-for'] as string) ||
			(req.headers['x-real-ip'] as string) ||
			req.ip ||
			req.connection?.remoteAddress ||
			'';
		const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : String(rawIp);
		// Avoid lint errors (require-await) by awaiting a Promise resolution
		return await Promise.resolve(ip);
	}
}
