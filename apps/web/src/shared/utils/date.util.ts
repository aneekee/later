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
