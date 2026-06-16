import { Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

import { validationFailed } from '../../core/errors/domain-error';

type MulterFile = Express.Multer.File;

export const N8N_UPLOAD_FILE_SIZE_LIMIT = 10 * 1024 * 1024;

const allowedMimeTypes = new Set([
	'text/plain',
	'text/markdown',
	'text/csv',
	'text/xml',
	'text/tab-separated-values',
	'application/json',
	'application/ld+json',
	'application/x-ndjson',
	'application/xml',
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const allowedExtensions = new Set([
	'txt',
	'md',
	'markdown',
	'csv',
	'json',
	'jsonl',
	'ndjson',
	'xml',
	'tsv',
	'pdf',
	'doc',
	'docx',
]);

function getFileExtension(filename: string): string {
	return filename.split('.').pop()?.toLowerCase() ?? '';
}

export const n8nUploadFileSchema = z
	.custom<MulterFile>(v => v && typeof v === 'object', {
		message: 'File is required',
	})
	.superRefine((file, ctx) => {
		if (!file?.originalname || !file?.buffer) {
			ctx.addIssue({ code: 'custom', message: 'Invalid file' });
			return;
		}

		const extension = getFileExtension(file.originalname);
		const isAllowedType =
			allowedMimeTypes.has(file.mimetype) || allowedExtensions.has(extension);

		if (!isAllowedType) {
			ctx.addIssue({
				code: 'custom',
				message: `Unsupported file type: ${file.mimetype}`,
			});
		}

		if (file.size > N8N_UPLOAD_FILE_SIZE_LIMIT) {
			ctx.addIssue({
				code: 'custom',
				message: `File too large. Max is ${N8N_UPLOAD_FILE_SIZE_LIMIT} bytes`,
			});
		}
	});

@Injectable()
export class N8nUploadFileValidationPipe implements PipeTransform {
	constructor(private readonly schema: z.ZodTypeAny = n8nUploadFileSchema) {}

	transform(value: unknown) {
		const parsed = this.schema.safeParse(value);
		if (!parsed.success) {
			const msg = parsed.error.issues.map(i => i.message).join('; ');
			throw validationFailed(msg);
		}
		return parsed.data;
	}
}
