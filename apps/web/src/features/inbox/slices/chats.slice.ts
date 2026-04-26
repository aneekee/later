import { createSlice } from '@reduxjs/toolkit';
import type { ChatEntity } from '@repo/types';

interface ChatsState {
  activeChat: ChatEntity | null;
}

const CHATS_SLICE_INIT_STATE: ChatsState = {
  activeChat: null,
};

export const chatsSlice = createSlice({
  name: 'chats',
  initialState: CHATS_SLICE_INIT_STATE,
  reducers: (create) => ({
    setActiveChat: create.reducer<{ chat: ChatEntity | null }>(
      (state, action) => {
        state.activeChat = action.payload.chat;
      },
    ),
  }),
});

export const { setActiveChat } = chatsSlice.actions;
