export const FEED_PAGE_SIZE = 10;

// keep in sync with the API rating validation
export const FEED_RATING_MIN = 0;
export const FEED_RATING_MAX = 10000;

// changes are sent to BE in one request after this pause
export const FEED_RATING_DEBOUNCE_MS = 600;

// press-and-hold: repeat after HOLD_DELAY, slowly first, then fast after FAST_AFTER,
// then twice as fast (max speed) after 2x FAST_AFTER
export const FEED_RATING_HOLD_DELAY_MS = 400;
export const FEED_RATING_HOLD_SLOW_INTERVAL_MS = 150;
export const FEED_RATING_HOLD_FAST_AFTER_MS = 1900;
export const FEED_RATING_HOLD_FAST_INTERVAL_MS = 50;
