import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import {
  GetNotesBurndownSuccessResponse,
  GetNotesTotalsSuccessResponse,
} from '@later/types';

import { StatsService } from './stats.service';
import { GetNotesBurndownDto } from './stats.dto';

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

  @Get('/burndown')
  async getNotesBurndown(
    @Req() req: Request,
    @Query() dto: GetNotesBurndownDto,
  ): Promise<GetNotesBurndownSuccessResponse> {
    const userId = req['user']?.id as string;

    const list = await this.statsService.getNotesBurndown({
      userId,
      timezone: dto.timezone,
    });

    return {
      message: 'Get notes burndown successful',
      data: {
        timezone: dto.timezone,
        list,
      },
    };
  }
}
