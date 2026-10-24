export interface GetFeedServiceDto {
  userId: string;
  pageSize: number;
}

export interface CheckFeedNoteAccessServiceDto {
  messageId: string;
  userId: string;
}

export interface CreateFeedNoteServiceDto {
  content: string;
  userId: string;
}

export interface SetFeedNoteRatingServiceDto {
  messageId: string;
  userId: string;
  rating: number;
}

export interface DeleteFeedNoteServiceDto {
  messageId: string;
  userId: string;
}

export type DbFeedItem = {
  id: string;
  createdAt: Date;
  chatId: string | null;
  rating: number;
  textMessage: { content: string } | null;
  chat: { title: string } | null;
};
