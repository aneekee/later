import type { GetFeedSuccessResponse, NoteEntity } from '@later/types';

/**
 * Splits the scrolled count of a feed visit into its Round and the notes
 * scrolled in that round. A count of exactly total stays total/total
 * in the current round, the next note starts the next round at 1.
 */
export const toFeedRound = (count: number, total: number) => {
  if (total <= 0) {
    return { round: 1, scrolled: 0 };
  }

  const round = Math.max(1, Math.ceil(count / total));
  return { round, scrolled: count - (round - 1) * total };
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
