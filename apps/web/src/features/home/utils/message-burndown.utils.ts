import type { MessageBurndownSnapshotEntity } from '@later/types';

import { clamp } from '@/shared/utils/numbers.utils';

export const mapBarchartMessageBurndownApiEntity = (
  entity: MessageBurndownSnapshotEntity,
) => ({
  ...entity,
  createdNotes: clamp(entity.createdNotes, 0, Infinity),
  resolvedNotes: clamp(entity.resolvedNotes, 0, Infinity),
});
