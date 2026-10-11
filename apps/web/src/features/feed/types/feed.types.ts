import type { SetMessageRatingRequestBody } from '@later/types';

export interface GetFeedParams {
  pageSize: number;
}

export interface SetMessageRatingParams {
  chatId: string;
  messageId: string;
  body: SetMessageRatingRequestBody;
}
