import type { NotesPeriodStats } from '@later/types';

import type {
  NotesStatsCardDetails,
  NotesStatsCardPeriod,
} from '../types/stats.types';

export const getPeriodLabel = (days: number) =>
  days === 1 ? '24h' : `${String(days)}d`;

export const toCardPeriods = (
  periods: NotesPeriodStats[],
  pick: (period: NotesPeriodStats) => Omit<NotesStatsCardPeriod, 'label'>,
): NotesStatsCardPeriod[] =>
  periods.map((period) => ({
    label: getPeriodLabel(period.days),
    ...pick(period),
  }));

export const formatDelta = (delta: number) => {
  if (delta > 0) {
    return `+${delta.toLocaleString('en-US')}`;
  }

  if (delta < 0) {
    return `−${Math.abs(delta).toLocaleString('en-US')}`;
  }

  return '0';
};

export const getDeltaClassName = (
  delta: number,
  goodDirection: NotesStatsCardDetails['goodDirection'],
) => {
  if (delta === 0) {
    return 'text-muted-foreground';
  }

  const isGood = goodDirection === 'up' ? delta > 0 : delta < 0;

  return isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';
};
