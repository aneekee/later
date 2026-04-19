import { BaseSuccessResponse, SuccessListResponse } from "./shared";

export interface ChatEntity {
  id: string;
  userId: string;
  title: string;
  icon: string | null;
  createdAt: Date;
}

// list chats

export interface ListChatsSuccessResponse extends SuccessListResponse<ChatEntity> {}

// create chat

export interface CreateChatRequestBody {
  title: string;
  icon?: string;
}

export interface CreateChatSuccessResponseData {
  chat: ChatEntity;
}

export interface CreateChatSuccessResponse extends BaseSuccessResponse<CreateChatSuccessResponseData> {}

// update chat

export interface UpdateChatRequestBody {
  title?: string;
  icon?: string;
}

export interface UpdateChatSuccessResponseData {
  chat: ChatEntity;
}

export interface UpdateChatSuccessResponse extends BaseSuccessResponse<UpdateChatSuccessResponseData> {}

// delete chat

export interface DeleteChatSuccessResponse extends BaseSuccessResponse {}
