import type { BaseSuccessResponse } from "./shared";

export type FeedItemEntity = {
  id: string;
  content: string;
  createdAt: string;
  chatId: string | null;
  chatTitle: string | null;
  rating: number;
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

// create note

export interface CreateFeedNoteRequestBody {
  content: string;
}

export interface CreateFeedNoteSuccessResponse extends BaseSuccessResponse<FeedItemEntity> {}

// set note rating

export interface SetFeedNoteRatingRequestBody {
  rating: number;
}

export type FeedNoteRatingEntity = {
  id: string;
  rating: number;
};

export interface SetFeedNoteRatingSuccessResponse extends BaseSuccessResponse<FeedNoteRatingEntity> {}

// delete note

export interface DeleteFeedNoteSuccessResponse extends BaseSuccessResponse {}
