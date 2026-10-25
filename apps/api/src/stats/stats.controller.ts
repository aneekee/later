import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

import { GetNotesTotalsSuccessResponse } from '@later/types';

import { StatsService } from './stats.service';

@Controller('v1/stats/notes')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('/totals')
  async getNotesTotals(
    @Req() req: Request,
  ): Promise<GetNotesTotalsSuccessResponse> {
    const userId = req['user']?.id as string;

    const totals = await this.statsService.getNotesTotals({ userId });

    return {
      message: 'Get notes totals successful',
      data: totals,
    };
  }
}
