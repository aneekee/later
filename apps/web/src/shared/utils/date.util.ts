import { DAY_IN_MS } from '../const/date.const';

export const formatIsoDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('en-CA');
};

export const formatIsoTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatIsoDateTime = (isoString: string): string => {
  return formatIsoDate(isoString) + ' ' + formatIsoTime(isoString);
};

export const isMoreThanOneDayApart = (
  isoStringA: string,
  isoStringB: string,
): boolean => {
  const a = new Date(isoStringA);
  const b = new Date(isoStringB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return diffMs > DAY_IN_MS;
};

export const isOnDifferentDay = (
  isoStringA: string,
  isoStringB: string,
): boolean => {
  return formatIsoDate(isoStringA) !== formatIsoDate(isoStringB);
};

export const getReadableDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};

export const getBrowserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Formats a calendar day. The day is already local to the user's timezone, so
 * it is parsed and formatted in UTC to avoid shifting it.
 *
 * @param day - Calendar day in YYYY-MM-DD format.
 * @param options - Intl formatting options. Defaults to short month and numeric day.
 * @returns The formatted day in the en-US locale.
 * @example
 * formatCalendarDay('2026-10-04'); // "Oct 4"
 */
export const formatCalendarDay = (
  day: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    ...options,
    timeZone: 'UTC',
  });

const DURATION_UNITS = [
  { suffix: 'd', ms: 24 * 60 * 60 * 1000 },
  { suffix: 'h', ms: 60 * 60 * 1000 },
  { suffix: 'm', ms: 60 * 1000 },
  { suffix: 's', ms: 1000 },
];

/**
 * Formats a duration using its two largest units. A zero second unit is dropped.
 *
 * @param ms - Duration in milliseconds.
 * @returns The formatted duration, or "<1s" when under one second.
 * @example
 * formatDuration(12_000_000); // "3h 20m"
 * formatDuration(187_200_000); // "2d 4h"
 * formatDuration(172_800_000); // "2d"
 * formatDuration(45_000); // "45s"
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return '<1s';
  }

  const index = DURATION_UNITS.findIndex((unit) => ms >= unit.ms);
  const major = DURATION_UNITS[index];
  const majorText = `${String(Math.floor(ms / major.ms))}${major.suffix}`;

  if (index === DURATION_UNITS.length - 1) {
    return majorText;
  }

  const minor = DURATION_UNITS[index + 1];
  const minorValue = Math.floor((ms % major.ms) / minor.ms);

  return minorValue > 0
    ? `${majorText} ${String(minorValue)}${minor.suffix}`
    : majorText;
};
