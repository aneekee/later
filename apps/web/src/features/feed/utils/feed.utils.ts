import type { GetFeedSuccessResponse, NoteEntity } from '@later/types';

import { FEED_RATING_MAX, FEED_RATING_MIN } from '../const/feed.constants';

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

export const clampRating = (rating: number): number =>
  Math.min(FEED_RATING_MAX, Math.max(FEED_RATING_MIN, rating));
