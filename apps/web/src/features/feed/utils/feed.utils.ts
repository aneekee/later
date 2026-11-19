import type { GetFeedSuccessResponse, NoteEntity } from '@later/types';

import type { FeedScrollState } from '../types/feed.types';

export const isHalfVisible = (
  card: DOMRectReadOnly,
  areaTop: number,
  areaBottom: number,
) => {
  const areaHeight = areaBottom - areaTop;
  const visibleHeight =
    Math.min(card.bottom, areaBottom) - Math.max(card.top, areaTop);

  return (
    visibleHeight > 0 && visibleHeight >= Math.min(card.height, areaHeight) / 2
  );
};

export const findCardsInView = (
  list: HTMLElement,
  areaTop: number,
  areaBottom: number,
) => {
  const children = list.children;
  let low = 0;
  let high = children.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (children[middle].getBoundingClientRect().bottom <= areaTop) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const cards: { noteId: string; rect: DOMRect }[] = [];
  for (let index = low; index < children.length; index++) {
    const child = children[index];
    const rect = child.getBoundingClientRect();
    if (rect.top >= areaBottom) {
      break;
    }
    if (child instanceof HTMLElement && child.dataset.noteId) {
      cards.push({ noteId: child.dataset.noteId, rect });
    }
  }

  return cards;
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
