import { Skeleton } from '@/shared/components/ui/skeleton';

import { useMessageBurndownSnapshotsQuery } from '../../api/messages-burndown.api';
import { MessageBurndownChart } from './MessageBurndownChart';
import { MESSAGE_BURNDOWN_FROM_DATE } from '../../const/message-burndown.const';
import { mapBurndownChartMessageBurndownApiEntity } from '../../utils/message-burndown.utils';

export const MessageBurndownChartContainer = () => {
  const { data, isLoading, isError } = useMessageBurndownSnapshotsQuery({
    fromDate: MESSAGE_BURNDOWN_FROM_DATE,
  });

  if (isLoading) {
    return <Skeleton className="h-75 w-full" />;
  }

  if (isError || !data?.data?.list) {
    return (
      <div className="flex h-75 w-full items-center justify-center text-sm text-muted-foreground">
        Failed to load burndown data.
      </div>
    );
  }

  if (data.data.list.length === 0) {
    return (
      <div className="flex h-75 w-full items-center justify-center text-sm text-muted-foreground">
        No burndown data available yet.
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Notes Resolution Burndown</h2>
      <MessageBurndownChart
        data={data.data.list.map((m) =>
          mapBurndownChartMessageBurndownApiEntity(m),
        )}
      />
    </div>
  );
};
