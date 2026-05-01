import { PerformanceAnalyticsRequest } from './performance.types';

export const getRequestPerformanceAnalyticsData = (
  req: PerformanceAnalyticsRequest,
) => {
  const { method, url } = req;
  const urlObj = new URL(url, 'https://dummy');
  const normalizedPath = urlObj.pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\/\d+/gi,
    '/:id',
  );
  const target = `${method} ${normalizedPath}`;
  const params = urlObj.search;

  return { target, params };
};
