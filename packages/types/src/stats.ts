import type { BaseSuccessResponse } from "./shared";

// notes totals

export type NotesTotals = {
  total: number;
};

export interface GetNotesTotalsSuccessResponse extends BaseSuccessResponse<NotesTotals> {}
