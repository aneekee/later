import { configureStore } from '@reduxjs/toolkit';

import { authApi } from './features/auth/api/auth.api';
import { chatsApi } from './features/inbox/api/chats.api';
import { messagesApi } from './features/inbox/api/messages.api';
import { chatsSlice } from './features/inbox/slices/chats.slice';

export const store = configureStore({
  reducer: {
    // api
    [authApi.reducerPath]: authApi.reducer,
    [chatsApi.reducerPath]: chatsApi.reducer,
    [messagesApi.reducerPath]: messagesApi.reducer,

    // slices
    [chatsSlice.name]: chatsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(chatsApi.middleware)
      .concat(messagesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

// TODO: do I really need it?
export type AppDispatch = typeof store.dispatch;
