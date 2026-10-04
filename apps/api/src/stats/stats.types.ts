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

export interface NotesBurndownPointDb {
  day: string;
  createdCum: bigint;
  resolvedCum: bigint;
}
