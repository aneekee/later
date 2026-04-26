import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  CreateTextMessageSuccessResponse,
  DeleteMessageSuccessResponse,
  ListMessagesSuccessResponse,
  UpdateTextMessageSuccessResponse,
} from '@repo/types';

import { baseQueryWithCookies } from '@/shared/api/api';

import { chatsApiEndpoints } from './chats.api';

import { buildOptimisticTextMessage } from '../utils/message.utils';

import type {
  CreateTextMessageParams,
  DeleteMessageParams,
  GetMessagesListParams,
  UpdateTextMessageParams,
} from '../types/messages.types';

export const messagesApi = createApi({
  reducerPath: 'messagesApi',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['Messages'],
  endpoints: () => ({}),
  keepUnusedDataFor: 0,
});

export const messagesApiEndpoints = messagesApi.injectEndpoints({
  endpoints: (builder) => ({
    messagesPage: builder.query<
      ListMessagesSuccessResponse,
      GetMessagesListParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams({
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
        });

        return {
          url: `v1/chats/${params.chatId}/messages?${queryParams}`,
          method: 'GET',
        };
      },
      providesTags: ['Messages'],
    }),

    messages: builder.infiniteQuery<
      ListMessagesSuccessResponse,
      GetMessagesListParams,
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
          url: `v1/chats/${queryArg.chatId}/messages?${queryParams}`,
        };
      },
      providesTags: ['Messages'],
    }),

    createTextMessage: builder.mutation<
      CreateTextMessageSuccessResponse,
      CreateTextMessageParams
    >({
      query: (params) => {
        return {
          url: `v1/chats/${params.chatId}/messages/text`,
          method: 'POST',
          body: params.body,
        };
      },
      onQueryStarted: async ({ chatId, body }, api) => {
        const { dispatch, queryFulfilled } = api;

        const optimisticMessage = buildOptimisticTextMessage(
          chatId,
          body.content,
        );

        const messagesQueries = (
          api.getState() as {
            messagesApi: {
              queries: Record<string, { originalArgs: GetMessagesListParams }>;
            };
          }
        ).messagesApi.queries;

        const patchResults = Object.entries(messagesQueries)
          .filter(
            ([key, entry]) =>
              key.startsWith('messages(') &&
              entry.originalArgs.chatId === chatId,
          )
          .map(([, entry]) =>
            dispatch(
              messagesApiEndpoints.util.updateQueryData(
                'messages',
                entry.originalArgs,
                (draft) => {
                  if (draft.pages[0]?.data) {
                    draft.pages[0].data.list.unshift(optimisticMessage);
                    draft.pages[0].data.totalSize += 1;
                  }
                },
              ),
            ),
          );

        try {
          await queryFulfilled;
          dispatch(chatsApiEndpoints.util.invalidateTags(['Chats']));
        } catch {
          patchResults.forEach((p) => p.undo());
        }
      },
      invalidatesTags: ['Messages'],
    }),

    updateMessage: builder.mutation<
      UpdateTextMessageSuccessResponse,
      UpdateTextMessageParams
    >({
      query: (params) => {
        return {
          url: `v1/chats/${params.chatId}/messages/text/${params.messageId}`,
          method: 'PATCH',
        };
      },
    }),

    deleteMessage: builder.mutation<
      DeleteMessageSuccessResponse,
      DeleteMessageParams
    >({
      query: (params) => {
        return {
          url: `v1/chats/${params.chatId}/messages/${params.messageId}`,
          method: 'DELETE',
        };
      },
      invalidatesTags: ['Messages'],
    }),
  }),
});

export const {
  useMessagesPageQuery,
  useMessagesInfiniteQuery,
  useCreateTextMessageMutation,
  useDeleteMessageMutation,
} = messagesApiEndpoints;
