import type {
  GetFeedSuccessResponse,
  NoteEntity,
  NoteTier,
} from '@later/types';

import { FEED_TIER_STYLES } from '../const/feed.constants';

/**
 * Flattens the feed pages. A note returned again in a later page
 * is rendered only at its latest position.
 */
export const dedupeKeepLast = (
  pages: GetFeedSuccessResponse[],
): NoteEntity[] => {
  const items = pages.flatMap((page) => page.data?.items ?? []);

  const lastIndexById = new Map<string, number>();
  items.forEach((item, index) => lastIndexById.set(item.id, index));

  return items.filter((item, index) => lastIndexById.get(item.id) === index);
};

/**
 * Removes a deleted note from every loaded page (it may be in several),
 * mutates the cache draft
 */
export const removeFeedItem = (
  pages: GetFeedSuccessResponse[],
  noteId: string,
) => {
  pages.forEach((page) => {
    if (!page.data) {
      return;
    }

    page.data.items = page.data.items.filter((item) => item.id !== noteId);
    page.data.total = Math.max(page.data.total - 1, 0);
  });
};

/**
 * The tiers in slider order, lowest (D) first
 */
export const getOrderedTiers = (): NoteTier[] =>
  (Object.keys(FEED_TIER_STYLES) as NoteTier[]).sort(
    (a, b) => FEED_TIER_STYLES[a].rank - FEED_TIER_STYLES[b].rank,
  );
