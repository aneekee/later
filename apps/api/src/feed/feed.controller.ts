import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { GetFeedSuccessResponse } from '@later/types';

import { FeedService } from './feed.service';
import { GetFeedDto } from './feed.dto';

@Controller('v1/feed')
export class FeedController {
  constructor(private feedService: FeedService) {}

  /**
   * Not idempotent: the returned notes are marked as seen
   */
  @Get()
  async getFeed(
    @Req() req: Request,
    @Query() dto: GetFeedDto,
  ): Promise<GetFeedSuccessResponse> {
    const userId = req['user']?.id as string;

    const page = await this.feedService.getNextPage({
      userId,
      pageSize: dto.pageSize,
    });

    return {
      message: 'Get feed successful',
      data: page,
    };
  }
}
