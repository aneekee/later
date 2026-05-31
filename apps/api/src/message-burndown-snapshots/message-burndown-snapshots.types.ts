import { MessageBurndownSnapshot } from 'generated/prisma/client';

export interface ListMessageBurndownSnapshotsServiceDto {
  userId: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface IncrementBurndownSnapshotServiceDto {
  userId: string;
  field: 'createdNotes' | 'resolvedNotes';
}

export interface FillMissingDaysServiceDto {
  snapshots: MessageBurndownSnapshot[];
  userId: string;
  start: Date;
  end: Date;
}
