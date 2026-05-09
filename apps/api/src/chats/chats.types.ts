export interface ListChatsServiceDto {
  userId: string;
  page: number;
  pageSize: number;
}

export interface CreateChatServiceDto {
  title: string;
  userId: string;
}

export interface UpdateChatServiceDto {
  title?: string;
}

export interface CheckChatAccessServiceDto {
  chatId: string;
  userId: string;
}
