import { createSlice } from '@reduxjs/toolkit';

interface ChatsState {
  activeChatId: string | null;
}

const CHATS_SLICE_INIT_STATE: ChatsState = {
  activeChatId: null,
};

export const chatsSlice = createSlice({
  name: 'chats',
  initialState: CHATS_SLICE_INIT_STATE,
  reducers: (create) => ({
    setActiveChatId: create.reducer<{ chatId: string | null }>(
      (state, action) => {
        state.activeChatId = action.payload.chatId;
      },
    ),
  }),
});

export const { setActiveChatId } = chatsSlice.actions;
