import type { BaseSuccessResponse, SuccessListResponse } from "./shared";

export interface ChatEntity {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}

// list chats

export interface ListChatsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  excludeId?: string;
}

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
  title: string;
}

export interface UpdateChatSuccessResponseData {
  chat: ChatEntity;
}

export interface UpdateChatSuccessResponse extends BaseSuccessResponse<UpdateChatSuccessResponseData> {}

// delete chat

export interface DeleteChatQueryParams {
  targetChatId?: string;
}

export interface DeleteChatSuccessResponse extends BaseSuccessResponse {}

// chat stats

export interface ChatStatsEntity {
  total: number;
  resolved: number;
  unresolved: number;
}

export interface GetChatStatsSuccessResponseData {
  stats: ChatStatsEntity;
}

export interface GetChatStatsSuccessResponse extends BaseSuccessResponse<GetChatStatsSuccessResponseData> {}
