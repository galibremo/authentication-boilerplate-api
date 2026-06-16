import { MediaSchemaType } from '../../core/database/types';

export type MediaDataType = Omit<MediaSchemaType, 'id' | 'publicId' | 'createdAt' | 'updatedAt'>;

export type MediaResponseType = Pick<
	MediaSchemaType,
	| 'publicId'
	| 'filename'
	| 'mimeType'
	| 'fileSize'
	| 'secureUrl'
	| 'mediaType'
	| 'altText'
	| 'width'
	| 'height'
	| 'tags'
	| 'createdAt'
	| 'updatedAt'
>;

export type MediaDeleteResponseType = MediaResponseType &
	Pick<MediaSchemaType, 'storageKey'>;
