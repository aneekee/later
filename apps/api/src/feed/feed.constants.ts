import type { NoteTier } from '@later/types';
import type { NoteTier as DbNoteTier } from 'generated/prisma/client';

/**
 * Each tier makes a note act as if it was seen this many weeks earlier,
 * so higher tiers come back sooner while every note keeps rotating
 */
export const FEED_TIER_BOOST_WEEKS: Record<NoteTier, number> = {
  S: 8,
  A: 4,
  B: 2,
  C: 1,
  D: 0,
};

// the Prisma enum and the shared union must be the same set of tiers
type IsSameSet<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;
const TIERS_IN_SYNC: IsSameSet<NoteTier, DbNoteTier> = true;
void TIERS_IN_SYNC;
