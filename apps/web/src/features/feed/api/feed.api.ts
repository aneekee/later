import { createApi } from '@reduxjs/toolkit/query/react';

import type { GetFeedSuccessResponse } from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

import { FEED_PAGE_SIZE } from '../const/feed.constants';
import type { FeedPageParam, GetFeedParams } from '../types/feed.types';

/**
 * The feed request is not idempotent: every fetched page is marked as seen on BE.
 * Never refetch the loaded pages (refetch, tags invalidation, refetchOn*),
 * it would mark more notes as seen and reshuffle the list.
 * The note mutations (notesApi) patch this cache instead.
 */
export const feedApi = createApi({
  reducerPath: 'feedApi',
  baseQuery: baseQueryWithCookies,
  endpoints: () => ({}),
  keepUnusedDataFor: 0,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  refetchOnMountOrArgChange: false,
});

export const feedApiEndpoints = feedApi.injectEndpoints({
  endpoints: (builder) => ({
    feed: builder.infiniteQuery<
      GetFeedSuccessResponse,
      GetFeedParams,
      FeedPageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: { pageSize: FEED_PAGE_SIZE },
        /**
         * A visit goes through the notes once, then ends. The page param asks
         * for the notes left, at most queryArg.pageSize, and passes the first
         * page's servedAt as `since`, so BE skips the notes already served in
         * the visit (a just-served S note can outrank an older D note within
         * seconds). The visit total is the first page's total (deletes lower
         * it, creates don't). The last page's total bounds it too, and BE's
         * `left` ends the visit once nothing is left to serve, e.g. when
         * another tab served or deleted the rest.
         */
        getNextPageParam: (
          lastPage,
          allPages,
          _lastPageParam,
          _allPageParams,
          queryArg,
        ) => {
          const visitTotal = allPages[0]?.data?.total ?? 0;
          const fetched = allPages.reduce(
            (sum, page) => sum + (page.data?.items.length ?? 0),
            0,
          );
          const remaining = Math.min(
            visitTotal - fetched,
            (lastPage.data?.total ?? 0) - fetched,
            lastPage.data?.left ?? 0,
          );

          return remaining > 0
            ? {
                pageSize: Math.min(queryArg.pageSize, remaining),
                since: allPages[0]?.data?.servedAt,
              }
            : undefined;
        },
      },
      query: ({ pageParam }) => {
        const queryParams = new URLSearchParams({
          pageSize: pageParam.pageSize.toString(),
        });
        if (pageParam.since) {
          queryParams.set('since', pageParam.since);
        }

        return {
          url: `v1/feed?${queryParams}`,
          method: 'GET',
        };
      },
    }),
  }),
});

export const { useFeedInfiniteQuery } = feedApiEndpoints;
