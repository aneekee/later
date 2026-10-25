import { NotebookPen } from 'lucide-react';

import { Skeleton } from '@/shared/components/ui/skeleton';

import { useNotesTotalsQuery } from '../../api/stats.api';
import { StatsError } from '../StatsError';
import { NotesStatsCard } from './NotesStatsCard';

const GRID_CLASS_NAME = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

export const NotesStatsContainer = () => {
  const { data, isLoading, isError, refetch } = useNotesTotalsQuery();

  if (isLoading) {
    return (
      <div className={GRID_CLASS_NAME}>
        <Skeleton className="h-[98px] w-full" />
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

  const { total } = data.data;

  return (
    <div className={GRID_CLASS_NAME}>
      <NotesStatsCard label="Total notes" value={total} icon={NotebookPen} />
    </div>
  );
};
