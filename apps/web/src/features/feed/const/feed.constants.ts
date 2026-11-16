import type { NoteTier } from '@later/types';

export const FEED_PAGE_SIZE = 10;

// links in the note text are rendered as anchors
export const URL_REGEX = /https?:\/\/[^\s]+/g;

// keep in sync with the API note validation
export const FEED_NOTE_MAX_LENGTH = 1000;

/**
 * The tier slider stops, declared left to right (D lowest): the key order is the slider order.
 * light / dark are the filled track color per theme, glow marks the top tier.
 * A new tier in @later/types fails type checks until it's added here.
 */
export const FEED_TIER_STYLES: Record<
  NoteTier,
  { light: string; dark: string; glow?: boolean }
> = {
  D: { light: '#af52de', dark: '#bf5af2' },
  C: { light: '#007aff', dark: '#0a84ff' },
  B: { light: '#34c759', dark: '#30d158' },
  A: { light: '#ffcc00', dark: '#ffd60a' },
  S: { light: '#ff9500', dark: '#ff9f0a', glow: true },
};

// the tiers in slider order, lowest first
export const FEED_TIERS = Object.keys(FEED_TIER_STYLES) as NoteTier[];

// tier changes are sent to BE in one request after this pause
export const FEED_TIER_DEBOUNCE_MS = 600;
