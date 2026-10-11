export interface GetFeedServiceDto {
  userId: string;
  pageSize: number;
}

export type DbFeedItem = {
  id: string;
  createdAt: Date;
  chatId: string;
  rating: number;
  textMessage: { content: string } | null;
  chat: { title: string };
};
