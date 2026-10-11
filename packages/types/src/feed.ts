import type { BaseSuccessResponse } from "./shared";

export type FeedItemEntity = {
  id: string;
  content: string;
  createdAt: string;
  chatId: string;
  chatTitle: string;
};

// get feed

export interface GetFeedQueryParams {
  pageSize: number;
}

export type FeedPage = {
  items: FeedItemEntity[];
  total: number;
};

export interface GetFeedSuccessResponse extends BaseSuccessResponse<FeedPage> {}
