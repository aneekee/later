import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { PerformanceAnalyticsService } from '../../performance-analytics/performance-analytics.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(
    private readonly performanceAnalyticsService: PerformanceAnalyticsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<{ method: string; url: string }>();

    const { method, url } = req;
    const urlObj = new URL(url, 'https://dummy');
    const normalizedPath = urlObj.pathname.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\/\d+/gi,
      '/:id',
    );
    const target = `${method} ${normalizedPath}`;
    const params = urlObj.search;
    const start = performance.now();

    return next.handle().pipe(
      tap(() => {
        const duration = performance.now() - start;
        this.logger.log(`${target} - ${duration.toFixed(2)}ms`);
        void this.performanceAnalyticsService
          .record({
            target,
            params,
            duration,
          })
          .catch((e: unknown) => {
            console.error(e);
          });
      }),
    );
  }
}
