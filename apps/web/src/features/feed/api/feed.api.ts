import { createApi } from '@reduxjs/toolkit/query/react';

import type { GetFeedSuccessResponse } from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

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
        initialPageParam: 1,
        // the page param is a counter only, BE always returns the next stalest notes
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          const total = lastPage.data?.total ?? 0;
          const pageSize = lastPage.data?.items.length ?? 0;
          return total > pageSize ? lastPageParam + 1 : undefined;
        },
      },
      query: ({ queryArg }) => {
        const queryParams = new URLSearchParams({
          pageSize: queryArg.pageSize.toString(),
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
