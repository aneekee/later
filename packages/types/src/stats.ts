import type { BaseSuccessResponse } from "./shared";

// notes totals

export type NotesGap = {
  avgMs: number;
  medianMs: number;
};

export type NotesPeriodStats = {
  days: number;
  unresolvedDelta: number;
  resolvedDelta: number;
  /** null when the window has fewer than 2 created notes */
  creationGap: NotesGap | null;
  /** null when the window has fewer than 2 resolutions */
  resolutionGap: NotesGap | null;
};

export type NotesTotals = {
  total: number;
  resolved: number;
  unresolved: number;
  periods: NotesPeriodStats[];
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
