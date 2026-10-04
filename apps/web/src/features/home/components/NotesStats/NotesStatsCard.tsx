import type { LucideIcon } from 'lucide-react';

import type { NotesGap } from '@later/types';

import { formatDuration } from '@/shared/utils/date.util';
import type { NotesStatsCardDetails } from '../../types/stats.types';
import { formatDelta, getDeltaClassName } from '../../utils/stats.utils';
import { Chip } from './NotesStatsCardChip';
import { ChipBlock } from './NotesStatsCardChipBlock';

// avg on the first line, median below it, matching the "avg / median" title
const renderGap = (gap: NotesGap | null) =>
  gap ? (
    <>
      <span className="block whitespace-nowrap">
        {formatDuration(gap.avgMs)}
      </span>
      <span className="block whitespace-nowrap text-muted-foreground">
        {formatDuration(gap.medianMs)}
      </span>
    </>
  ) : (
    '—'
  );

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
  details?: NotesStatsCardDetails;
}

export const NotesStatsCard = ({
  label,
  value,
  icon: Icon,
  details,
}: Props) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className="size-4" />
      </div>
      <p className="text-3xl font-semibold tabular-nums">
        {value.toLocaleString('en-US')}
      </p>
      {details && (
        <div className="mt-2 flex flex-col gap-3">
          <ChipBlock title="Change">
            {details.periods.map((period) => (
              <Chip
                key={period.label}
                label={period.label}
                value={formatDelta(period.delta)}
                valueClassName={getDeltaClassName(
                  period.delta,
                  details.goodDirection,
                )}
              />
            ))}
          </ChipBlock>
          <ChipBlock title={`${details.gapTitle} (avg / median)`}>
            {details.periods.map((period) => (
              <Chip
                key={period.label}
                label={period.label}
                value={renderGap(period.gap)}
              />
            ))}
          </ChipBlock>
        </div>
      )}
    </div>
  );
};
