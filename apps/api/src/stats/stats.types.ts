export interface GetNotesTotalsServiceDto {
  userId: string;
}

export interface GetNotesBurndownServiceDto {
  userId: string;
  timezone: string;
}

export interface NotesTotalsDb {
  total: bigint;
  resolved: bigint;
}

export interface NotesPeriodCountsDb {
  days: number;
  created: bigint;
  resolved: bigint;
}

export type NotesGapKind = 'creation' | 'resolution';

export interface NotesPeriodGapDb {
  days: number;
  kind: NotesGapKind;
  avgMs: number;
  medianMs: number;
}

export interface NotesBurndownPointDb {
  day: string;
  createdCum: bigint;
  resolvedCum: bigint;
}
