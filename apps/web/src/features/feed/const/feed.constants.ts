import type { NoteTier } from '@later/types';

export const FEED_PAGE_SIZE = 10;

// links in the note text are rendered as anchors
export const URL_REGEX = /https?:\/\/[^\s]+/g;

// keep in sync with the API note validation
export const FEED_NOTE_MAX_LENGTH = 1000;

/**
 * The tier slider stops: rank orders them left to right (D lowest),
 * light / dark are the filled track color per theme, glow marks the top tier.
 * A new tier in @later/types fails type checks until it's added here.
 */
export const FEED_TIER_STYLES: Record<
  NoteTier,
  { rank: number; light: string; dark: string; glow?: boolean }
> = {
  D: { rank: 0, light: '#af52de', dark: '#bf5af2' },
  C: { rank: 1, light: '#007aff', dark: '#0a84ff' },
  B: { rank: 2, light: '#34c759', dark: '#30d158' },
  A: { rank: 3, light: '#ffcc00', dark: '#ffd60a' },
  S: { rank: 4, light: '#ff9500', dark: '#ff9f0a', glow: true },
};

// tier changes are sent to BE in one request after this pause
export const FEED_TIER_DEBOUNCE_MS = 600;
