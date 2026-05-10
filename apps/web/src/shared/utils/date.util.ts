import { DAY_IN_MS } from '../const/date.const';

export const formatIsoDate = (isoString: string): string => {
  return isoString.slice(0, 10);
};

export const formatIsoTime = (isoString: string): string => {
  return isoString.slice(11, 16);
};

export const formatIsoDateTime = (isoString: string): string => {
  return isoString.slice(0, 10) + ' ' + isoString.slice(11, 16);
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
  return isoStringA.slice(0, 10) !== isoStringB.slice(0, 10);
};

export const getReadableDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};
