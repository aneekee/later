import type { BaseSuccessResponse } from "./shared";
import type { NoteEntity } from "./notes";

// get feed

export interface GetFeedQueryParams {
  pageSize: number;
}

export type FeedPage = {
  items: NoteEntity[];
  total: number;
};

export interface GetFeedSuccessResponse extends BaseSuccessResponse<FeedPage> {}
