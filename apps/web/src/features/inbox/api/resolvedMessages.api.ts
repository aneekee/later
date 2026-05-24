import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  DeleteMessageSuccessResponse,
  ListResolvedMessagesSuccessResponse,
  UnresolveMessageSuccessResponse,
} from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

import type { BasePaginationParams } from '@/shared/types/api';

import type {
  DeleteMessageParams,
  UnresolveMessageParams,
} from '../types/messages.types';

interface GetResolvedMessagesListParams extends BasePaginationParams {
  chatId: string;
}

export const resolvedMessagesApi = createApi({
  reducerPath: 'resolvedMessagesApi',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['ResolvedMessages'],
  endpoints: () => ({}),
  keepUnusedDataFor: 0,
});

export const resolvedMessagesApiEndpoints = resolvedMessagesApi.injectEndpoints(
  {
    endpoints: (builder) => ({
      resolvedMessages: builder.infiniteQuery<
        ListResolvedMessagesSuccessResponse,
        GetResolvedMessagesListParams,
        number
      >({
        infiniteQueryOptions: {
          initialPageParam: 1,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            const totalSize = lastPage.data?.totalSize ?? 0;
            const pageSize = lastPage.data?.pageSize ?? 0;
            const fetched = allPages.length * pageSize;
            return fetched < totalSize ? lastPageParam + 1 : undefined;
          },
        },
        query: ({ queryArg, pageParam }) => {
          const queryParams = new URLSearchParams({
            page: pageParam.toString(),
            pageSize: queryArg.pageSize.toString(),
          });

          return {
            method: 'GET',
            url: `v1/chats/${queryArg.chatId}/messages/resolved?${queryParams}`,
          };
        },
        providesTags: ['ResolvedMessages'],
      }),

      unresolveResolvedMessage: builder.mutation<
        UnresolveMessageSuccessResponse,
        UnresolveMessageParams
      >({
        query: (params) => {
          return {
            url: `v1/chats/${params.chatId}/messages/${params.messageId}/resolution/${params.resolutionId}`,
            method: 'DELETE',
          };
        },
        invalidatesTags: ['ResolvedMessages'],
      }),

      deleteResolvedMessage: builder.mutation<
        DeleteMessageSuccessResponse,
        DeleteMessageParams
      >({
        query: (params) => {
          return {
            url: `v1/chats/${params.chatId}/messages/${params.messageId}`,
            method: 'DELETE',
          };
        },
        onQueryStarted: async ({ messageId }, api) => {
          const { dispatch, queryFulfilled } = api;

          const resolvedMessagesQueries = (
            api.getState() as {
              resolvedMessagesApi: {
                queries: Record<
                  string,
                  { originalArgs: GetResolvedMessagesListParams }
                >;
              };
            }
          ).resolvedMessagesApi.queries;

          const patchResults = Object.entries(resolvedMessagesQueries)
            .filter(([key]) => key.startsWith('resolvedMessages('))
            .map(([, entry]) =>
              dispatch(
                resolvedMessagesApiEndpoints.util.updateQueryData(
                  'resolvedMessages',
                  entry.originalArgs,
                  (draft) => {
                    for (const page of draft.pages) {
                      if (page.data) {
                        const index = page.data.list.findIndex(
                          (m) => m.id === messageId,
                        );
                        if (index !== -1) {
                          page.data.list.splice(index, 1);
                          page.data.totalSize -= 1;
                          break;
                        }
                      }
                    }
                  },
                ),
              ),
            );

          try {
            await queryFulfilled;
          } catch {
            patchResults.forEach((p) => p.undo());
          }
        },
        invalidatesTags: ['ResolvedMessages'],
      }),
    }),
  },
);

export const {
  useResolvedMessagesInfiniteQuery,
  useUnresolveResolvedMessageMutation,
  useDeleteResolvedMessageMutation,
} = resolvedMessagesApiEndpoints;
