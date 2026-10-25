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
