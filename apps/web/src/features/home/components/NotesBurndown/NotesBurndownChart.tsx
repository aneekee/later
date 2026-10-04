import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import type { NotesBurndownPoint } from '@later/types';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/components/ui/chart';
import { formatCalendarDay } from '@/shared/utils/date.util';

const chartConfig = {
  total: {
    label: 'Total',
    color: 'var(--color-foreground)',
  },
  resolved: {
    label: 'Resolved',
    color: 'var(--color-chart-2)',
  },
} satisfies ChartConfig;

interface Props {
  data: NotesBurndownPoint[];
}

export const NotesBurndownChart = ({ data }: Props) => {
  return (
    <ChartContainer config={chartConfig} className="h-75 w-full">
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => formatCalendarDay(value)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) =>
                typeof label === 'string'
                  ? formatCalendarDay(label, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : (label as string)
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="resolved"
          stroke="var(--color-resolved)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
};
