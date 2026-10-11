import { Injectable } from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { GetFeedServiceDto } from './feed.types';
import {
  buildFeedOrderSql,
  buildFeedWhere,
  buildFeedWhereSql,
  mapToFeedItem,
} from './feed.utils';

@Injectable()
export class FeedService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Returns the next feed page and marks it as seen,
   * so the next call returns the following notes
   */
  async getNextPage(dto: GetFeedServiceDto) {
    return this.prismaService.$transaction(async (tx) => {
      // the order is an expression, Prisma orderBy can't express it
      const rows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT m.id FROM messages m
          JOIN chats c ON c.id = m.chat_id
          ${buildFeedWhereSql(dto.userId)}
          ${buildFeedOrderSql()}
          LIMIT ${dto.pageSize}
        `,
      );
      const ids = rows.map((row) => row.id);

      const messages = await tx.message.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          createdAt: true,
          chatId: true,
          rating: true,
          textMessage: { select: { content: true } },
          chat: { select: { title: true } },
        },
      });
      const messageById = new Map(messages.map((m) => [m.id, m]));
      const orderedMessages = ids.flatMap((id) => messageById.get(id) ?? []);

      await tx.message.updateMany({
        where: { id: { in: ids } },
        data: { seenAt: new Date() },
      });

      const total = await tx.message.count({
        where: buildFeedWhere(dto.userId),
      });

      return {
        items: orderedMessages.map(mapToFeedItem),
        total,
      };
    });
  }
}
