import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import type { MessageBurndownSnapshotEntity } from '@later/types';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/components/ui/chart';

const chartConfig = {
  createdNotes: {
    label: 'Created',
    color: 'var(--color-chart-1)',
  },
  resolvedNotes: {
    label: 'Resolved',
    color: 'var(--color-chart-2)',
  },
} satisfies ChartConfig;

interface MessageBurndownBarChartProps {
  data: MessageBurndownSnapshotEntity[];
}

export const MessageBurndownBarChart = ({
  data,
}: MessageBurndownBarChartProps) => {
  return (
    <ChartContainer config={chartConfig} className="h-75 w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
        <Bar
          dataKey="createdNotes"
          fill="var(--color-createdNotes)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="resolvedNotes"
          fill="var(--color-resolvedNotes)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
};
