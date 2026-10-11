import { Prisma } from 'generated/prisma/client';

import { FeedItemEntity } from '@later/types';

import { DbFeedItem } from './feed.types';

export function buildFeedWhere(userId: string): Prisma.MessageWhereInput {
  return {
    chat: { userId },
    messageResolution: { is: null },
  };
}

/**
 * The feed order: never seen notes first, then the ones not seen for the longest time.
 * Extend the ranking rules here.
 */
export function buildFeedOrder(): Prisma.MessageOrderByWithRelationInput[] {
  return [
    { seenAt: { sort: 'asc', nulls: 'first' } },
    { createdAt: 'asc' },
    { id: 'asc' },
  ];
}

export function mapToFeedItem(message: DbFeedItem): FeedItemEntity {
  return {
    id: message.id,
    content: message.textMessage?.content ?? '',
    createdAt: message.createdAt.toISOString(),
    chatId: message.chatId,
    chatTitle: message.chat.title,
  };
}
