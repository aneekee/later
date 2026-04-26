export const formatIsoDate = (isoString: string): string => {
  return isoString.slice(0, 10);
};

export const formatIsoTime = (isoString: string): string => {
  return isoString.slice(11, 16);
};

export const formatIsoDateTime = (isoString: string): string => {
  return isoString.slice(0, 10) + ' ' + isoString.slice(11, 16);
};
