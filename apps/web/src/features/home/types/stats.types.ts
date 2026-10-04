import type { NotesGap } from '@later/types';

export interface GetNotesBurndownParams {
  timezone: string;
}

export interface NotesStatsCardPeriod {
  label: string;
  delta: number;
  gap: NotesGap | null;
}

export interface NotesStatsCardDetails {
  /** which delta direction is an improvement, e.g. fewer unresolved notes */
  goodDirection: 'up' | 'down';
  gapTitle: string;
  periods: NotesStatsCardPeriod[];
}
