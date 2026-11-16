import { Prisma } from 'generated/prisma/client';

import { FEED_TIER_BOOST_WEEKS } from './feed.constants';

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
 * The note's tier boost in weeks, see FEED_TIER_BOOST_WEEKS. A note without a tier counts as D.
 * The enum is cast to text, it can't be compared with text parameters
 */
function buildTierBoostSql(): Prisma.Sql {
  const cases = Object.entries(FEED_TIER_BOOST_WEEKS).map(
    ([tier, weeks]) => Prisma.sql`WHEN ${tier} THEN ${weeks}::int`,
  );

  return Prisma.sql`(CASE COALESCE(n.tier::text, 'D') ${Prisma.join(cases, ' ')} ELSE 0 END)`;
}

/**
 * The feed order: never seen notes first, then the ones not seen for the longest time.
 * The tier boost shifts the note's seen_at back by FEED_TIER_BOOST_WEEKS,
 * so higher tiers come back sooner; on a tie the higher tier goes first.
 * Postgres sorts an enum by its declared order, and note_tier is declared highest first.
 * Extend the ranking rules here.
 * Expects `notes n`
 */
export function buildFeedOrderSql(): Prisma.Sql {
  return Prisma.sql`
    ORDER BY
      n.seen_at - make_interval(weeks => ${buildTierBoostSql()}) ASC NULLS FIRST,
      COALESCE(n.tier, 'D') ASC,
      n.created_at ASC,
      n.id ASC
  `;
}
