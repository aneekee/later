import { CircleCheck, CircleDashed, NotebookPen } from 'lucide-react';

import { Skeleton } from '@/shared/components/ui/skeleton';

import { useNotesTotalsQuery } from '../../api/stats.api';
import { StatsError } from '../StatsError';
import { NotesStatsCard } from './NotesStatsCard';
import { toCardPeriods } from '../../utils/stats.utils';

const GRID_CLASS_NAME = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

export const NotesStatsContainer = () => {
  const { data, isLoading, isError, refetch } = useNotesTotalsQuery();

  if (isLoading) {
    return (
      <div className={GRID_CLASS_NAME}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-60 w-full" />
        ))}
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <StatsError
        title="Failed to load notes stats."
        onRetry={() => void refetch()}
      />
    );
  }

  const { total, unresolved, resolved, periods } = data.data;

  return (
    <div className={GRID_CLASS_NAME}>
      <NotesStatsCard label="Total notes" value={total} icon={NotebookPen} />
      <NotesStatsCard
        label="Unresolved"
        value={unresolved}
        icon={CircleDashed}
        details={{
          goodDirection: 'down',
          gapTitle: 'Creation gap',
          periods: toCardPeriods(periods, (p) => ({
            delta: p.unresolvedDelta,
            gap: p.creationGap,
          })),
        }}
      />
      <NotesStatsCard
        label="Resolved"
        value={resolved}
        icon={CircleCheck}
        details={{
          goodDirection: 'up',
          gapTitle: 'Resolution gap',
          periods: toCardPeriods(periods, (p) => ({
            delta: p.resolvedDelta,
            gap: p.resolutionGap,
          })),
        }}
      />
    </div>
  );
};
