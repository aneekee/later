import { configureStore } from '@reduxjs/toolkit';

import { authApi } from './features/auth/api/auth.api';
import { chatsApi } from './features/inbox/api/chats.api';
import { messagesApi } from './features/inbox/api/messages.api';
import { resolvedMessagesApi } from './features/inbox/api/resolvedMessages.api';
import { statsApi } from './features/home/api/stats.api';
import { feedApi } from './features/feed/api/feed.api';
import { chatsSlice } from './features/inbox/slices/chats.slice';

export const store = configureStore({
  reducer: {
    // api
    [authApi.reducerPath]: authApi.reducer,
    [chatsApi.reducerPath]: chatsApi.reducer,
    [messagesApi.reducerPath]: messagesApi.reducer,
    [resolvedMessagesApi.reducerPath]: resolvedMessagesApi.reducer,
    [statsApi.reducerPath]: statsApi.reducer,
    [feedApi.reducerPath]: feedApi.reducer,

    // slices
    [chatsSlice.name]: chatsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(chatsApi.middleware)
      .concat(messagesApi.middleware)
      .concat(resolvedMessagesApi.middleware)
      .concat(statsApi.middleware)
      .concat(feedApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

// TODO: do I really need it?
export type AppDispatch = typeof store.dispatch;
