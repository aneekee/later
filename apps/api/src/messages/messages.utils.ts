import { Prisma } from 'generated/prisma/client';

import {
  MessageEntity,
  MessageResolutionFilter,
  ResolvedMessageEntity,
} from '@later/types';

import { DbMessageItem, DbResolvedMessageItem } from './messages.types';

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

export function mapResolvedMessageModelToEntity(
  message: DbResolvedMessageItem,
): ResolvedMessageEntity {
  return {
    ...mapMessageModelToEntity(message),
    chat: { id: message.chat.id, title: message.chat.title },
  };
}
