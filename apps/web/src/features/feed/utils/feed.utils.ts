import type { GetFeedSuccessResponse, NoteEntity } from '@later/types';

import type { FeedScrollState } from '../types/feed.types';

/**
 * Counts a card that just became half visible as Scrolled (CONTEXT.md):
 * a note the user scrolled to in the current visit to the feed.
 * A note counts at most once.
 */
export const countScrolledCard = (
  state: FeedScrollState,
  noteId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- rounds will use it
  _total: number,
): FeedScrollState => {
  if (state.counted.has(noteId)) {
    return state;
  }

  return { ...state, counted: new Set(state.counted).add(noteId) };
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
