import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  CreateChatRequestBody,
  CreateChatSuccessResponse,
  DeleteChatSuccessResponse,
  GetChatStatsSuccessResponse,
  ListChatsSuccessResponse,
  UpdateChatRequestBody,
  UpdateChatSuccessResponse,
} from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';
import type { BasePaginationParams } from '@/shared/types/api';

import { messagesApi } from './messages.api';
import { resolvedMessagesApi } from './resolvedMessages.api';
import type {
  DeleteChatParams,
  GetChatsListParams,
} from '../types/chats.types';

export const chatsApi = createApi({
  reducerPath: 'chatsApi',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['Chats'],
  endpoints: () => ({}),
  keepUnusedDataFor: 0,
});

export const chatsApiEndpoints = chatsApi.injectEndpoints({
  endpoints: (builder) => ({
    chatsPage: builder.query<ListChatsSuccessResponse, BasePaginationParams>({
      query: (params) => {
        const queryParams = new URLSearchParams({
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
        });

        return {
          url: `v1/chats?${queryParams}`,
          method: 'GET',
        };
      },
      providesTags: ['Chats'],
    }),

    chats: builder.infiniteQuery<
      ListChatsSuccessResponse,
      GetChatsListParams,
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

        if (queryArg.search) {
          queryParams.set('search', queryArg.search);
        }

        if (queryArg.excludeId) {
          queryParams.set('excludeId', queryArg.excludeId);
        }

        return {
          url: `v1/chats?${queryParams}`,
          method: 'GET',
        };
      },
      providesTags: ['Chats'],
    }),

    createChat: builder.mutation<
      CreateChatSuccessResponse,
      CreateChatRequestBody
    >({
      query: (body) => ({
        url: 'v1/chats',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Chats'],
    }),

    updateChat: builder.mutation<
      UpdateChatSuccessResponse,
      UpdateChatRequestBody
    >({
      query: (body) => ({
        url: 'v1/chats',
        method: 'PATCH',
        body,
      }),
      // TODO: invalidate the exact chat
      invalidatesTags: ['Chats'],
    }),

    chatStats: builder.query<GetChatStatsSuccessResponse, string>({
      query: (chatId) => ({
        url: `v1/chats/${chatId}/stats`,
        method: 'GET',
      }),
    }),

    deleteChat: builder.mutation<DeleteChatSuccessResponse, DeleteChatParams>({
      query: ({ chatId, targetChatId }) => ({
        url: `v1/chats/${chatId}`,
        method: 'DELETE',
        params: targetChatId ? { targetChatId } : undefined,
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          dispatch(messagesApi.util.invalidateTags(['Messages']));
          dispatch(
            resolvedMessagesApi.util.invalidateTags(['ResolvedMessages']),
          );
        } catch {
          // handled by the caller
        }
      },
      invalidatesTags: ['Chats'],
    }),
  }),
});

export const {
  useChatsPageQuery,
  useChatsInfiniteQuery,
  useCreateChatMutation,
  useUpdateChatMutation,
  useChatStatsQuery,
  useDeleteChatMutation,
} = chatsApiEndpoints;
