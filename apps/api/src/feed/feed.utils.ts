import { Prisma } from 'generated/prisma/client';

import { FeedItemEntity } from '@later/types';

import { FEED_RATING_STEP_HOURS } from './feed.constants';
import { DbFeedItem } from './feed.types';

/**
 * Prisma equivalent of buildFeedWhereSql, keep them in sync
 */
export function buildFeedWhere(userId: string): Prisma.MessageWhereInput {
  return {
    chat: { userId },
    messageResolution: { is: null },
  };
}

/**
 * Raw SQL equivalent of buildFeedWhere, keep them in sync.
 * Expects `messages m JOIN chats c`
 */
export function buildFeedWhereSql(userId: string): Prisma.Sql {
  return Prisma.sql`
    WHERE c.user_id = ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM message_resolutions r WHERE r.message_id = m.id
      )
  `;
}

/**
 * The feed order: never seen notes first, then the ones not seen for the longest time.
 * Every rating point shifts the note's seen_at back by FEED_RATING_STEP_HOURS,
 * so higher rated notes come back sooner.
 * Extend the ranking rules here.
 */
export function buildFeedOrderSql(): Prisma.Sql {
  return Prisma.sql`
    ORDER BY
      m.seen_at - make_interval(hours => m.rating * ${FEED_RATING_STEP_HOURS}::int) ASC NULLS FIRST,
      m.rating DESC,
      m.created_at ASC,
      m.id ASC
  `;
}

export function mapToFeedItem(message: DbFeedItem): FeedItemEntity {
  return {
    id: message.id,
    content: message.textMessage?.content ?? '',
    createdAt: message.createdAt.toISOString(),
    chatId: message.chatId,
    chatTitle: message.chat.title,
    rating: message.rating,
  };
}
