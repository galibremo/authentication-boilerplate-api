import { z } from 'zod';

import { validateString } from '../../core/validators/common.schema';

export const updateKnowledgeBaseSchema = z
	.object({
		systemMessage: validateString('System Message'),
	})
	.strict();

export type UpdateKnowledgeBaseDto = z.infer<typeof updateKnowledgeBaseSchema>;
