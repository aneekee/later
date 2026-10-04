import type { BaseSuccessResponse } from "./shared";

// notes totals

export type NotesTotals = {
  total: number;
  resolved: number;
  unresolved: number;
};

export interface GetNotesTotalsSuccessResponse extends BaseSuccessResponse<NotesTotals> {}

// notes burndown

export type NotesBurndownPoint = {
  /** local calendar day, YYYY-MM-DD */
  day: string;
  total: number;
  resolved: number;
};

export interface GetNotesBurndownSuccessResponse extends BaseSuccessResponse<{
  timezone: string;
  list: NotesBurndownPoint[];
}> {}
