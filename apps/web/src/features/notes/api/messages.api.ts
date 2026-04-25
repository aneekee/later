import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  CreateTextMessageSuccessResponse,
  DeleteMessageSuccessResponse,
  ListMessagesSuccessResponse,
  UpdateTextMessageSuccessResponse,
} from '@repo/types';

import { baseQueryWithCookies } from '@/shared/api/api';

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
    messages: builder.query<ListMessagesSuccessResponse, GetMessagesListParams>(
      {
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
      },
    ),

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
    }),
  }),
});

export const { useMessagesQuery, useCreateTextMessageMutation } =
  messagesApiEndpoints;
