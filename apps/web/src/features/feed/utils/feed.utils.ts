import type { GetFeedSuccessResponse, NoteEntity } from '@later/types';

import type { FeedScrollState } from '../types/feed.types';

export const isHalfVisible = (entry: IntersectionObserverEntry) => {
  if (!entry.isIntersecting) {
    return false;
  }

  const areaHeight = entry.rootBounds?.height ?? 0;
  const coversHalfOfArea =
    areaHeight > 0 && entry.intersectionRect.height >= areaHeight / 2;

  return entry.intersectionRatio >= 0.5 || coversHalfOfArea;
};

export const countScrolledCard = (
  state: FeedScrollState,
  noteId: string,
  total: number,
): FeedScrollState => {
  if (!state.counted.has(noteId)) {
    return { ...state, counted: new Set(state.counted).add(noteId) };
  }

  const isRoundComplete = state.counted.size >= total;
  if (isRoundComplete) {
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
