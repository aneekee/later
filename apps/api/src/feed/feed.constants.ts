import type { NoteTier } from '@later/types';

/**
 * Each tier multiplies the time since the note was last seen,
 * so higher tiers come back proportionally sooner while every note keeps rotating.
 * A just served note has no staleness to multiply, so it always goes to the back
 */
export const FEED_TIER_FACTOR: Record<NoteTier, number> = {
  S: 16,
  A: 8,
  B: 4,
  C: 2,
  D: 1,
};
