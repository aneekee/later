export interface GetFeedServiceDto {
  userId: string;
  pageSize: number;
}

export type DbFeedItem = {
  id: string;
  createdAt: Date;
  chatId: string;
  textMessage: { content: string } | null;
  chat: { title: string };
};
