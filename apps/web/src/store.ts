import { configureStore } from '@reduxjs/toolkit';

import { authApi } from './features/auth/api/auth.api';
import { statsApi } from './features/home/api/stats.api';
import { feedApi } from './features/feed/api/feed.api';

export const store = configureStore({
  reducer: {
    // api
    [authApi.reducerPath]: authApi.reducer,
    [statsApi.reducerPath]: statsApi.reducer,
    [feedApi.reducerPath]: feedApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(statsApi.middleware)
      .concat(feedApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

// TODO: do I really need it?
export type AppDispatch = typeof store.dispatch;
