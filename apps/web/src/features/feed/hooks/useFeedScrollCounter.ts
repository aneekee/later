import { useCallback, useState } from 'react';

import { toFeedRound } from '../utils/feed.utils';

interface Params {
  served: number;
  latestPageItems: number;
  hasNextPage: boolean;
  pageCount: number;
  latestPageTotal: number;
}

/**
 * Counts by page: the notes served before the latest loaded page,
 * or all served notes once the feed has ended.
 */
export const useFeedScrollCounter = ({
  served,
  latestPageItems,
  hasNextPage,
  pageCount,
  latestPageTotal,
}: Params) => {
  const [created, setCreated] = useState({ created: 0, pageCount });

  const createdSinceLatestPage =
    created.pageCount === pageCount ? created.created : 0;
  const total = latestPageTotal + createdSinceLatestPage;

  const count = hasNextPage ? served - latestPageItems : served;
  const { scrolled, round } = toFeedRound(count, total);

  const noteCreated = useCallback(() => {
    setCreated((prev) => ({
      created: (prev.pageCount === pageCount ? prev.created : 0) + 1,
      pageCount,
    }));
  }, [pageCount]);

  return { scrolled, total, round, noteCreated };
};
