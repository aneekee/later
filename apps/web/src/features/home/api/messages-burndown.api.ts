import { createApi } from '@reduxjs/toolkit/query/react';

import type { ListMessageBurndownSnapshotsSuccessResponse } from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

export interface ListMessageBurndownSnapshotsParams {
  fromDate?: string;
  toDate?: string;
}

export const messageBurndownApi = createApi({
  reducerPath: 'messageBurndownApi',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['MessageBurndownSnapshots'],
  endpoints: () => ({}),
  keepUnusedDataFor: 0,
});

export const messageBurndownApiEndpoints = messageBurndownApi.injectEndpoints({
  endpoints: (builder) => ({
    messageBurndownSnapshots: builder.query<
      ListMessageBurndownSnapshotsSuccessResponse,
      ListMessageBurndownSnapshotsParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();

        if (params.fromDate) {
          queryParams.set('fromDate', params.fromDate);
        }

        if (params.toDate) {
          queryParams.set('toDate', params.toDate);
        }

        const qs = queryParams.toString();

        return {
          url: `v1/message-burndown-snapshots${qs ? `?${qs}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['MessageBurndownSnapshots'],
    }),
  }),
});

export const { useMessageBurndownSnapshotsQuery } = messageBurndownApiEndpoints;
