import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { PerformanceAnalyticsService } from './performance-analytics.service';

@Module({
  imports: [PrismaModule],
  providers: [PerformanceAnalyticsService],
  exports: [PerformanceAnalyticsService],
})
export class PerformanceAnalyticsModule {}
