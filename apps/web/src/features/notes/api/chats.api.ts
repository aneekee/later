import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  CreateChatRequestBody,
  CreateChatSuccessResponse,
  DeleteChatSuccessResponse,
  ListChatsSuccessResponse,
  UpdateChatRequestBody,
  UpdateChatSuccessResponse,
} from '@repo/types';

import { baseQueryWithCookies } from '@/shared/api/api';
import type { BasePaginationParams } from '@/shared/types/api';

export const chatsApi = createApi({
  reducerPath: 'chatsApi',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['Chats'],
  endpoints: () => ({}),
  keepUnusedDataFor: 0,
});

export const chatsApiEndpoints = chatsApi.injectEndpoints({
  endpoints: (builder) => ({
    chats: builder.query<ListChatsSuccessResponse, BasePaginationParams>({
      query: (params) => {
        const queryParams = new URLSearchParams({
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
        });

        return {
          url: `v1/chatss?${queryParams}`,
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

    deleteChat: builder.mutation<DeleteChatSuccessResponse, string>({
      query: (id) => ({
        url: `v1/chats/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chats'],
    }),
  }),
});

export const {
  useChatsQuery,
  useCreateChatMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
} = chatsApiEndpoints;
