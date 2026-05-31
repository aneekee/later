import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import {
  FillMissingDaysServiceDto,
  IncrementBurndownSnapshotServiceDto,
  ListMessageBurndownSnapshotsServiceDto,
} from './message-burndown-snapshots.types';

@Injectable()
export class MessageBurndownSnapshotsService {
  constructor(private prismaService: PrismaService) {}

  async list(dto: ListMessageBurndownSnapshotsServiceDto) {
    const snapshots = await this.prismaService.messageBurndownSnapshot.findMany(
      {
        where: {
          userId: dto.userId,
          ...(dto.toDate ? { day: { lte: dto.toDate } } : {}),
        },
        orderBy: { day: 'asc' },
      },
    );

    if (snapshots.length === 0) {
      return [];
    }

    const end = new Date(dto.toDate ?? snapshots[snapshots.length - 1].day);

    const allDays = this.fillMissingDays({
      snapshots,
      userId: dto.userId,
      start: snapshots[0].day,
      end,
    });

    const withTotals = this.computeRunningTotals(allDays);
    if (!dto.fromDate) {
      return withTotals;
    }

    const fromKey = dto.fromDate.toISOString().split('T')[0];
    return withTotals.filter((entry) => entry.day >= fromKey);
  }

  private fillMissingDays(dto: FillMissingDaysServiceDto) {
    const snapshotMap = new Map(
      dto.snapshots.map((s) => [s.day.toISOString().split('T')[0], s]),
    );

    const startUtc = new Date(dto.start);
    startUtc.setUTCHours(0, 0, 0, 0);
    const endUtc = new Date(dto.end);
    endUtc.setUTCHours(0, 0, 0, 0);

    const result = [];
    const cursor = new Date(startUtc);

    while (cursor <= endUtc) {
      const key = cursor.toISOString().split('T')[0];
      const snapshot = snapshotMap.get(key);
      result.push(
        snapshot
          ? {
              id: snapshot.id,
              day: key,
              userId: snapshot.userId,
              createdNotes: snapshot.createdNotes,
              resolvedNotes: snapshot.resolvedNotes,
            }
          : {
              id: key,
              day: key,
              userId: dto.userId,
              createdNotes: 0,
              resolvedNotes: 0,
            },
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
  }

  private computeRunningTotals(
    entries: ReturnType<MessageBurndownSnapshotsService['fillMissingDays']>,
  ) {
    let totalCreatedNotes = 0;
    let totalResolvedNotes = 0;

    return entries.map((entry) => {
      totalCreatedNotes += entry.createdNotes;
      totalResolvedNotes += entry.resolvedNotes;
      return { ...entry, totalCreatedNotes, totalResolvedNotes };
    });
  }

  async increment(dto: IncrementBurndownSnapshotServiceDto) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prismaService.messageBurndownSnapshot.upsert({
      where: { userId_day: { userId: dto.userId, day: today } },
      create: {
        userId: dto.userId,
        day: today,
        createdNotes: dto.field === 'createdNotes' ? 1 : 0,
        resolvedNotes: dto.field === 'resolvedNotes' ? 1 : 0,
      },
      update: {
        [dto.field]: { increment: 1 },
      },
    });
  }
}
