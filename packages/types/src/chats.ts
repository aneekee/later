import { BaseSuccessResponse, SuccessListResponse } from "./shared";

export interface ChatEntity {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}

// list chats

export interface ListChatsSuccessResponse extends SuccessListResponse<ChatEntity> {}

// create chat

export interface CreateChatRequestBody {
  title: string;
}

export interface CreateChatSuccessResponseData {
  chat: ChatEntity;
}

export interface CreateChatSuccessResponse extends BaseSuccessResponse<CreateChatSuccessResponseData> {}

// update chat

export interface UpdateChatRequestBody {
  title?: string;
}

export interface UpdateChatSuccessResponseData {
  chat: ChatEntity;
}

export interface UpdateChatSuccessResponse extends BaseSuccessResponse<UpdateChatSuccessResponseData> {}

// delete chat

export interface DeleteChatSuccessResponse extends BaseSuccessResponse {}
