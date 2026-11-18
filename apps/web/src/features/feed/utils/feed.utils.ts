import type { GetFeedSuccessResponse, NoteEntity } from '@later/types';

import type { FeedScrollState } from '../types/feed.types';

/**
 * Counts a card that just became half visible as Scrolled (CONTEXT.md):
 * a note the user scrolled to in the current visit to the feed.
 * A note counts at most once per Round (CONTEXT.md): once every note has been
 * scrolled (counted covers the total), the next already counted note starts
 * the next round with only that note counted.
 */
export const countScrolledCard = (
  state: FeedScrollState,
  noteId: string,
  total: number,
): FeedScrollState => {
  if (!state.counted.has(noteId)) {
    return { ...state, counted: new Set(state.counted).add(noteId) };
  }

  if (state.counted.size >= total) {
    return { counted: new Set([noteId]), round: state.round + 1 };
  }

  return state;
};

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
