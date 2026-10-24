import type {
  CreateFeedNoteRequestBody,
  SetFeedNoteRatingRequestBody,
} from '@later/types';

export interface GetFeedParams {
  pageSize: number;
}

export interface CreateFeedNoteParams {
  body: CreateFeedNoteRequestBody;
}

export interface SetFeedNoteRatingParams {
  messageId: string;
  body: SetFeedNoteRatingRequestBody;
}

export interface DeleteFeedNoteParams {
  messageId: string;
}
