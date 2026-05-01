import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { PerformanceAnalyticsService } from '../../performance-analytics/performance-analytics.service';
import { PerformanceAnalyticsRequest } from './performance.types';
import { getRequestPerformanceAnalyticsData } from './performance.utils';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private readonly performanceAnalyticsService: PerformanceAnalyticsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<PerformanceAnalyticsRequest>();

    const { target, params } = getRequestPerformanceAnalyticsData(req);

    const start = performance.now();

    return next.handle().pipe(
      tap(() => {
        const duration = performance.now() - start;
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
