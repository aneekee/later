import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface Props {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

export const Chip = ({ label, value, valueClassName }: Props) => (
  <div className="flex flex-col rounded-md border px-2 py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn('text-sm font-medium tabular-nums', valueClassName)}>
      {value}
    </span>
  </div>
);
