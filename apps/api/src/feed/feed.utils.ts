import { Prisma } from 'generated/prisma/client';

import { FEED_RATING_STEP_HOURS } from './feed.constants';

/**
 * Prisma equivalent of buildFeedWhereSql, keep them in sync
 */
export function buildFeedWhere(userId: string): Prisma.NoteWhereInput {
  return { userId };
}

/**
 * Raw SQL equivalent of buildFeedWhere, keep them in sync.
 * Expects `notes n`
 */
export function buildFeedWhereSql(userId: string): Prisma.Sql {
  return Prisma.sql`
    WHERE n.user_id = ${userId}
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
      n.seen_at - make_interval(hours => n.rating * ${FEED_RATING_STEP_HOURS}::int) ASC NULLS FIRST,
      n.rating DESC,
      n.created_at ASC,
      n.id ASC
  `;
}
