import { MessageEntity } from '@later/types';

import { DbMessageItem } from './messages.types';

export function mapMessageModelToEntity(message: DbMessageItem): MessageEntity {
  return {
    ...message,
    ...(message.messageResolution
      ? {
          messageResolution: {
            ...message.messageResolution,
            createdAt: message.messageResolution.createdAt.toISOString(),
          },
        }
      : { messageResolution: undefined }),
    createdAt: message.createdAt.toISOString(),
  };
}
