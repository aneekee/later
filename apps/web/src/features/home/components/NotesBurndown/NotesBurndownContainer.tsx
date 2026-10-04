import { Skeleton } from '@/shared/components/ui/skeleton';

import { useNotesBurndownQuery } from '../../api/stats.api';
import { StatsError } from '../StatsError';
import { NotesBurndownChart } from './NotesBurndownChart';
import { getBrowserTimezone } from '@/shared/utils/date.util';

const CHART_HEIGHT_CLASS_NAME = 'h-75';

export const NotesBurndownContainer = () => {
  const { data, isLoading, isError, refetch } = useNotesBurndownQuery({
    timezone: getBrowserTimezone(),
  });

  const renderContent = () => {
    if (isLoading) {
      return <Skeleton className={`${CHART_HEIGHT_CLASS_NAME} w-full`} />;
    }

    if (isError || !data?.data) {
      return (
        <StatsError
          title="Failed to load the burndown chart."
          onRetry={() => void refetch()}
          className={CHART_HEIGHT_CLASS_NAME}
        />
      );
    }

    const list = data.data.list;
    const hasNotes = list.some((p) => p.total > 0);

    if (!hasNotes) {
      return (
        <div
          className={`flex ${CHART_HEIGHT_CLASS_NAME} w-full items-center justify-center rounded-lg border text-sm text-muted-foreground`}
        >
          No notes in the last 3 months yet. Start writing to see your burndown.
        </div>
      );
    }

    return <NotesBurndownChart data={list} />;
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Notes burndown</h2>
        <p className="text-sm text-muted-foreground">
          Total created and resolved notes over the last 3 months
        </p>
      </div>
      {renderContent()}
    </section>
  );
};
