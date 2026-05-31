import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ListMessageBurndownSnapshotsSuccessResponse } from '@later/types';

import { MessageBurndownSnapshotsService } from './message-burndown-snapshots.service';
import { ListMessageBurndownSnapshotsDto } from './message-burndown-snapshots.dto';

@Controller('v1/message-burndown-snapshots')
export class MessageBurndownSnapshotsController {
  constructor(
    private messageBurndownSnapshotsService: MessageBurndownSnapshotsService,
  ) {}

  @Get()
  async listSnapshots(
    @Req() req: Request,
    @Query() dto: ListMessageBurndownSnapshotsDto,
  ): Promise<ListMessageBurndownSnapshotsSuccessResponse> {
    const userId = req['user']?.id as string;

    const list = await this.messageBurndownSnapshotsService.list({
      userId,
      fromDate: dto.fromDate ? new Date(dto.fromDate) : undefined,
      toDate: dto.toDate ? new Date(dto.toDate) : undefined,
    });

    return {
      message: 'Get message burndown snapshots successful',
      data: { list },
    };
  }
}
