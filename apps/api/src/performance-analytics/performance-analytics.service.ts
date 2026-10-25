import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePerformanceEventDto } from './performance-analytics.types';

@Injectable()
export class PerformanceAnalyticsService {
  constructor(private prismaService: PrismaService) {}

  async record(dto: CreatePerformanceEventDto): Promise<void> {
    await this.prismaService.performanceEvent.create({ data: dto });
  }
}
