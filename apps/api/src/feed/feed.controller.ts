import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  CreateFeedNoteSuccessResponse,
  DeleteFeedNoteSuccessResponse,
  GetFeedSuccessResponse,
  SetFeedNoteRatingSuccessResponse,
} from '@later/types';

import { FeedService } from './feed.service';
import {
  CreateFeedNoteDto,
  GetFeedDto,
  SetFeedNoteRatingDto,
} from './feed.dto';

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

  @Post('notes')
  async createNote(
    @Req() req: Request,
    @Body() dto: CreateFeedNoteDto,
  ): Promise<CreateFeedNoteSuccessResponse> {
    const userId = req['user']?.id as string;

    const note = await this.feedService.createNote({
      userId,
      content: dto.content,
    });

    return {
      message: 'Create note successful',
      data: note,
    };
  }

  @Put('notes/:messageId/rating')
  async setNoteRating(
    @Req() req: Request,
    @Param('messageId') messageId: string,
    @Body() dto: SetFeedNoteRatingDto,
  ): Promise<SetFeedNoteRatingSuccessResponse> {
    const userId = req['user']?.id as string;

    const rating = await this.feedService.setNoteRating({
      userId,
      messageId,
      rating: dto.rating,
    });

    return {
      message: 'Note rating update successful',
      data: rating,
    };
  }

  @Delete('notes/:messageId')
  async deleteNote(
    @Req() req: Request,
    @Param('messageId') messageId: string,
  ): Promise<DeleteFeedNoteSuccessResponse> {
    const userId = req['user']?.id as string;

    await this.feedService.deleteNote({
      userId,
      messageId,
    });

    return {
      message: 'Delete note successful',
    };
  }
}
