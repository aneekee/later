import type { MessageBurndownSnapshotEntity } from '@later/types';

import { clamp } from '@/shared/utils/numbers.utils';

export const mapBarchartMessageBurndownApiEntity = (
  entity: MessageBurndownSnapshotEntity,
): MessageBurndownSnapshotEntity => ({
  ...entity,
  createdNotes: clamp(entity.createdNotes, 0, Infinity),
  resolvedNotes: clamp(entity.resolvedNotes, 0, Infinity),
});

export const mapBurndownChartMessageBurndownApiEntity = (
  entity: MessageBurndownSnapshotEntity,
): MessageBurndownSnapshotEntity => ({
  ...entity,
  totalCreatedNotes: clamp(entity.totalCreatedNotes, 0, Infinity),
  totalResolvedNotes: clamp(entity.totalResolvedNotes, 0, Infinity),
});
