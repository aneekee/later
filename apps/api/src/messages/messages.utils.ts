import { MessageEntity, MessageResolutionFilter } from '@later/types';
import { Prisma } from 'generated/prisma/client';

import { DbMessageItem } from './messages.types';

export function getResolutionFilter(
  resolution: MessageResolutionFilter,
): Pick<Prisma.MessageWhereInput, 'messageResolution'> {
  if (resolution === 'resolved') {
    return { messageResolution: { isNot: null } };
  }

  if (resolution === 'unresolved') {
    return { messageResolution: { is: null } };
  }

  return {};
}

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
