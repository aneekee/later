import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  CreateFeedNoteSuccessResponse,
  DeleteFeedNoteSuccessResponse,
  GetFeedSuccessResponse,
  SetFeedNoteRatingSuccessResponse,
} from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

import { FEED_PAGE_SIZE } from '../const/feed.constants';
import type {
  CreateFeedNoteParams,
  DeleteFeedNoteParams,
  GetFeedParams,
  SetFeedNoteRatingParams,
} from '../types/feed.types';
import { removeFeedItem } from '../utils/feed.utils';

/**
 * The feed request is not idempotent: every fetched page is marked as seen on BE.
 * Never refetch the loaded pages (refetch, tags invalidation, refetchOn*),
 * it would mark more notes as seen and reshuffle the list.
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

    createFeedNote: builder.mutation<
      CreateFeedNoteSuccessResponse,
      CreateFeedNoteParams
    >({
      query: (params) => {
        return {
          url: 'v1/feed/notes',
          method: 'POST',
          body: params.body,
        };
      },
      // no tags and no cache patch: the note is created as seen on BE,
      // the feed returns it later, at the end of the rotation
    }),

    setFeedNoteRating: builder.mutation<
      SetFeedNoteRatingSuccessResponse,
      SetFeedNoteRatingParams
    >({
      query: (params) => {
        return {
          url: `v1/feed/notes/${params.messageId}/rating`,
          method: 'PUT',
          body: params.body,
        };
      },
      // no tags: the feed is never refetched, the confirmed rating is patched into the cache,
      // so a remounted card (e.g. moved by dedupe) starts from it
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const rating = data.data?.rating ?? params.body.rating;

          dispatch(
            feedApiEndpoints.util.updateQueryData(
              'feed',
              { pageSize: FEED_PAGE_SIZE },
              (draft) => {
                draft.pages.forEach((page) => {
                  page.data?.items.forEach((item) => {
                    if (item.id === params.messageId) {
                      item.rating = rating;
                    }
                  });
                });
              },
            ),
          );
        } catch {
          // the caller reverts and shows the error
        }
      },
    }),

    deleteFeedNote: builder.mutation<
      DeleteFeedNoteSuccessResponse,
      DeleteFeedNoteParams
    >({
      query: (params) => {
        return {
          url: `v1/feed/notes/${params.messageId}`,
          method: 'DELETE',
        };
      },
      // no tags: the feed is never refetched, the deleted note is removed from the cache
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;

          dispatch(
            feedApiEndpoints.util.updateQueryData(
              'feed',
              { pageSize: FEED_PAGE_SIZE },
              (draft) => removeFeedItem(draft.pages, params.messageId),
            ),
          );
        } catch {
          // the caller shows the error
        }
      },
    }),
  }),
});

export const {
  useFeedInfiniteQuery,
  useCreateFeedNoteMutation,
  useSetFeedNoteRatingMutation,
  useDeleteFeedNoteMutation,
} = feedApiEndpoints;
