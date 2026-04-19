export interface ListChatsServiceDto {
  userId: string;
  page: number;
  pageSize: number;
}

export interface CreateChatServiceDto {
  title: string;
  icon?: string;
  userId: string;
}

export interface UpdateChatServiceDto {
  title?: string;
  icon?: string;
}

export interface CheckChatAccessServiceDto {
  chatId: string;
  userId: string;
}
