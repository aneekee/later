import { createApi } from '@reduxjs/toolkit/query/react';

import type { GetFeedSuccessResponse } from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

import { FEED_PAGE_SIZE } from '../const/feed.constants';
import type { GetFeedParams } from '../types/feed.types';

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
    feed: builder.infiniteQuery<GetFeedSuccessResponse, GetFeedParams, number>({
      infiniteQueryOptions: {
        initialPageParam: FEED_PAGE_SIZE,
        /**
         * A visit goes through the notes once, then ends. The page param is
         * the requested page size: the notes left, at most queryArg.pageSize,
         * BE always returns the next stalest notes. The visit total is the
         * first page's total (deletes lower it, creates don't). The last
         * page's total bounds it too, so the visit ends even if notes are
         * deleted elsewhere.
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
          const remaining =
            Math.min(visitTotal, lastPage.data?.total ?? 0) - fetched;

          return remaining > 0
            ? Math.min(queryArg.pageSize, remaining)
            : undefined;
        },
      },
      query: ({ pageParam }) => {
        const queryParams = new URLSearchParams({
          pageSize: pageParam.toString(),
        });

        return {
          url: `v1/feed?${queryParams}`,
          method: 'GET',
        };
      },
    }),
  }),
});

export const { useFeedInfiniteQuery } = feedApiEndpoints;
