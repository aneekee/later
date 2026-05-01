import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  PerformanceEvent,
  PerformanceEventSchema,
} from './performance-analytics.schema';
import { PerformanceAnalyticsService } from './performance-analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PerformanceEvent.name, schema: PerformanceEventSchema },
    ]),
  ],
  providers: [PerformanceAnalyticsService],
  exports: [PerformanceAnalyticsService],
})
export class PerformanceAnalyticsModule {}
