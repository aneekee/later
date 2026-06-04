import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import type { MessageBurndownSnapshotEntity } from '@later/types';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/components/ui/chart';

const chartConfig = {
  totalCreatedNotes: {
    label: 'Created',
    color: 'var(--color-chart-1)',
  },
  totalResolvedNotes: {
    label: 'Resolved',
    color: 'var(--color-chart-2)',
  },
} satisfies ChartConfig;

interface MessageBurndownChartProps {
  data: MessageBurndownSnapshotEntity[];
}

export const MessageBurndownChart = ({ data }: MessageBurndownChartProps) => {
  return (
    <ChartContainer config={chartConfig} className="h-75 w-full">
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) =>
            new Date(value).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          }
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => {
                if (typeof label === 'string') {
                  return new Date(label).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                }

                return label as string;
              }}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="totalCreatedNotes"
          stroke="var(--color-totalCreatedNotes)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="totalResolvedNotes"
          stroke="var(--color-totalResolvedNotes)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
};
