import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  CreateNoteSuccessResponse,
  DeleteNoteSuccessResponse,
  SetNoteRatingSuccessResponse,
} from '@later/types';

import { feedApiEndpoints } from '@/features/feed/api/feed.api';
import { FEED_PAGE_SIZE } from '@/features/feed/const/feed.constants';
import { removeFeedItem } from '@/features/feed/utils/feed.utils';
import { baseQueryWithCookies } from '@/shared/api/api';

import type {
  CreateNoteParams,
  DeleteNoteParams,
  SetNoteRatingParams,
} from '../types/notes.types';

/**
 * The feed request is not idempotent (see feedApi), so these mutations
 * patch the feed cache with updateQueryData, never invalidate or refetch it.
 */
export const notesApi = createApi({
  reducerPath: 'notesApi',
  baseQuery: baseQueryWithCookies,
  endpoints: () => ({}),
});

export const notesApiEndpoints = notesApi.injectEndpoints({
  endpoints: (builder) => ({
    createNote: builder.mutation<CreateNoteSuccessResponse, CreateNoteParams>({
      query: (params) => {
        return {
          url: 'v1/notes',
          method: 'POST',
          body: params.body,
        };
      },
      // no tags and no cache patch: the note is created as seen on BE,
      // the feed returns it later, at the end of the rotation
    }),

    setNoteRating: builder.mutation<
      SetNoteRatingSuccessResponse,
      SetNoteRatingParams
    >({
      query: (params) => {
        return {
          url: `v1/notes/${params.noteId}/rating`,
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
                    if (item.id === params.noteId) {
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

    deleteNote: builder.mutation<DeleteNoteSuccessResponse, DeleteNoteParams>({
      query: (params) => {
        return {
          url: `v1/notes/${params.noteId}`,
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
              (draft) => removeFeedItem(draft.pages, params.noteId),
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
  useCreateNoteMutation,
  useSetNoteRatingMutation,
  useDeleteNoteMutation,
} = notesApiEndpoints;
