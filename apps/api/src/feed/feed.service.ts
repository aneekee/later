import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import { GetFeedServiceDto } from './feed.types';
import { buildFeedOrder, buildFeedWhere, mapToFeedItem } from './feed.utils';

@Injectable()
export class FeedService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Returns the next feed page and marks it as seen,
   * so the next call returns the following notes
   */
  async getNextPage(dto: GetFeedServiceDto) {
    const where = buildFeedWhere(dto.userId);

    return this.prismaService.$transaction(async (tx) => {
      const messages = await tx.message.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          chatId: true,
          textMessage: { select: { content: true } },
          chat: { select: { title: true } },
        },
        orderBy: buildFeedOrder(),
        take: dto.pageSize,
      });

      await tx.message.updateMany({
        where: { id: { in: messages.map((message) => message.id) } },
        data: { seenAt: new Date() },
      });

      const total = await tx.message.count({ where });

      return {
        items: messages.map(mapToFeedItem),
        total,
      };
    });
  }
}
