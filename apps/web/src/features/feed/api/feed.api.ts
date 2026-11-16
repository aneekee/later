import { createApi } from '@reduxjs/toolkit/query/react';

import type { GetFeedSuccessResponse } from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

import type { GetFeedParams } from '../types/feed.types';
import {
  applyConfirmedTiersSince,
  getTierConfirmationSeq,
} from '../utils/confirmedTiers';

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
      queryFn: async ({ queryArg }, _api, _extraOptions, baseQuery) => {
        const queryParams = new URLSearchParams({
          pageSize: queryArg.pageSize.toString(),
        });

        // a tier save confirmed while this page is in flight is newer than the page
        const sinceSeq = getTierConfirmationSeq();
        const result = await baseQuery({
          url: `v1/feed?${queryParams}`,
          method: 'GET',
        });

        if (result.error) {
          return { error: result.error };
        }

        const page = result.data as GetFeedSuccessResponse;
        if (!page.data) {
          return { data: page };
        }

        return {
          data: {
            ...page,
            data: {
              ...page.data,
              items: applyConfirmedTiersSince(page.data.items, sinceSeq),
            },
          },
        };
      },
    }),
  }),
});

export const { useFeedInfiniteQuery } = feedApiEndpoints;
