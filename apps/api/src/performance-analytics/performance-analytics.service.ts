import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  PerformanceEvent,
  PerformanceEventDocument,
} from './performance-analytics.schema';
import { CreatePerformanceEventDto } from './performance-analytics.types';

@Injectable()
export class PerformanceAnalyticsService {
  constructor(
    @InjectModel(PerformanceEvent.name)
    private readonly performanceEventModel: Model<PerformanceEventDocument>,
  ) {}

  async record(dto: CreatePerformanceEventDto): Promise<void> {
    await this.performanceEventModel.create({
      ...dto,
      createdAt: new Date(),
    });
  }
}
