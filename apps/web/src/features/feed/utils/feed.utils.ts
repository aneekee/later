import type { FeedItemEntity, GetFeedSuccessResponse } from '@later/types';

/**
 * Flattens the feed pages. A note returned again in a later page
 * is rendered only at its latest position.
 */
export const dedupeKeepLast = (
  pages: GetFeedSuccessResponse[],
): FeedItemEntity[] => {
  const items = pages.flatMap((page) => page.data?.items ?? []);

  const lastIndexById = new Map<string, number>();
  items.forEach((item, index) => lastIndexById.set(item.id, index));

  return items.filter((item, index) => lastIndexById.get(item.id) === index);
};

const RELATIVE_UNITS = [
  { suffix: 'd', ms: 24 * 60 * 60 * 1000 },
  { suffix: 'h', ms: 60 * 60 * 1000 },
  { suffix: 'm', ms: 60 * 1000 },
  { suffix: 's', ms: 1000 },
];

const RELATIVE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Formats a date relative to now, Twitter-like.
 *
 * @example
 * formatRelativeTime(fiveHoursAgo); // "5h"
 * formatRelativeTime(threeDaysAgo); // "3d"
 * formatRelativeTime(twoWeeksAgo); // "Sep 27"
 * formatRelativeTime(lastYear); // "Sep 27, 2025"
 */
export const formatRelativeTime = (
  isoString: string,
  now: Date = new Date(),
): string => {
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 1000) {
    return 'now';
  }

  if (diffMs < RELATIVE_MAX_MS) {
    const unit =
      RELATIVE_UNITS.find((u) => diffMs >= u.ms) ?? RELATIVE_UNITS[3];
    return `${String(Math.floor(diffMs / unit.ms))}${unit.suffix}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
};
