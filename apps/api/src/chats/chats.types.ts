export interface ListChatsServiceDto {
  userId: string;
  page: number;
  pageSize: number;
  search?: string;
  excludeId?: string;
}

export interface GetOneChatServiceDto {
  chatId: string;
  userId: string;
}

export interface CreateChatServiceDto {
  title: string;
  userId: string;
}

export interface UpdateChatServiceDto {
  title: string;
  userId: string;
}

export interface CheckChatAccessServiceDto {
  chatId: string;
  userId: string;
}

export interface DeleteChatServiceDto {
  chatId: string;
  userId: string;
}

export interface DeleteChatAndMoveMessagesServiceDto {
  chatId: string;
  targetChatId: string;
  userId: string;
}

export interface GetChatStatsServiceDto {
  chatId: string;
  userId: string;
}
