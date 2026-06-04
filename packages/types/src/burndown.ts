import { BaseSuccessResponse } from "./shared";

export type MessageBurndownSnapshotEntity = {
  id: string | null;
  day: string;
  userId: string;
  createdNotes: number;
  resolvedNotes: number;
  totalCreatedNotes: number;
  totalResolvedNotes: number;
};

// list message burndown snapshots

export interface ListMessageBurndownSnapshotsSuccessResponseData {
  list: MessageBurndownSnapshotEntity[];
}

export interface ListMessageBurndownSnapshotsSuccessResponse extends BaseSuccessResponse<ListMessageBurndownSnapshotsSuccessResponseData> {}
