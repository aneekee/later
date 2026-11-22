import type { BaseSuccessResponse } from "./shared";
import type { NoteEntity } from "./notes";

// get feed

export interface GetFeedQueryParams {
  pageSize: number;
  /**
   * The visit's start, the first page's `servedAt` (ISO 8601).
   * Notes seen at or after it are skipped, so a visit never serves a note twice
   */
  since?: string;
}

export type FeedPage = {
  items: NoteEntity[];
  total: number;
  /** When this page was served (ISO 8601), the notes in it are marked seen at this time */
  servedAt: string;
  /** Notes not served yet in this visit, after this page */
  left: number;
};

export interface GetFeedSuccessResponse extends BaseSuccessResponse<FeedPage> {}
