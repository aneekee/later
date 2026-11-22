import { Prisma } from 'generated/prisma/client';

import { FEED_TIER_FACTOR } from './feed.constants';

/**
 * The user's notes; with `since` (the visit's start), only those not seen since,
 * i.e. not served yet in this visit.
 * Prisma equivalent of buildFeedWhereSql, keep them in sync
 */
export function buildFeedWhere(
  userId: string,
  since?: Date,
): Prisma.NoteWhereInput {
  if (!since) {
    return { userId };
  }

  return { userId, OR: [{ seenAt: null }, { seenAt: { lt: since } }] };
}

/**
 * Raw SQL equivalent of buildFeedWhere, keep them in sync.
 * Expects `notes n`
 */
export function buildFeedWhereSql(userId: string, since?: Date): Prisma.Sql {
  if (!since) {
    return Prisma.sql`
      WHERE n.user_id = ${userId}
    `;
  }

  return Prisma.sql`
    WHERE n.user_id = ${userId}
      AND (n.seen_at IS NULL OR n.seen_at < ${since})
  `;
}

/**
 * The note's tier factor, see FEED_TIER_FACTOR. A note without a tier counts as D.
 * The enum is cast to text, it can't be compared with text parameters
 */
function buildTierFactorSql(): Prisma.Sql {
  const cases = Object.entries(FEED_TIER_FACTOR).map(
    ([tier, factor]) => Prisma.sql`WHEN ${tier} THEN ${factor}::float8`,
  );

  return Prisma.sql`(CASE COALESCE(n.tier::text, 'D') ${Prisma.join(cases, ' ')} ELSE 1 END)`;
}

/**
 * The feed order: never seen notes first, then by effective staleness, the stalest first.
 * Effective staleness is the time since the note was last seen times its tier factor
 * (FEED_TIER_FACTOR), so higher tiers come back sooner and a just served note goes to the back;
 * on a tie the higher tier goes first.
 * Postgres sorts an enum by its declared order, and note_tier is declared highest first.
 * Extend the ranking rules here.
 * Expects `notes n`
 */
export function buildFeedOrderSql(): Prisma.Sql {
  return Prisma.sql`
    ORDER BY
      (now() - n.seen_at) * ${buildTierFactorSql()} DESC NULLS FIRST,
      COALESCE(n.tier, 'D') ASC,
      n.created_at ASC,
      n.id ASC
  `;
}
