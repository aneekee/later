import { ForbiddenException, Injectable } from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  CheckFeedNoteAccessServiceDto,
  CreateFeedNoteServiceDto,
  DeleteFeedNoteServiceDto,
  GetFeedServiceDto,
  SetFeedNoteRatingServiceDto,
} from './feed.types';
import {
  FEED_ITEM_SELECT,
  buildFeedOrderSql,
  buildFeedWhere,
  buildFeedWhereSql,
  mapToFeedItem,
} from './feed.utils';

@Injectable()
export class FeedService {
  constructor(private prismaService: PrismaService) {}

  async checkNoteAccess(dto: CheckFeedNoteAccessServiceDto) {
    const message = await this.prismaService.message.findUnique({
      where: { id: dto.messageId, userId: dto.userId },
    });

    if (!message) {
      throw new ForbiddenException("You don't have access to this note");
    }
  }

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
          ${buildFeedWhereSql(dto.userId)}
          ${buildFeedOrderSql()}
          LIMIT ${dto.pageSize}
        `,
      );
      const ids = rows.map((row) => row.id);

      const messages = await tx.message.findMany({
        where: { id: { in: ids } },
        select: FEED_ITEM_SELECT,
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

  /**
   * Creates a chat-less note. It's created as seen,
   * so the feed returns it at the end of the rotation
   */
  async createNote(dto: CreateFeedNoteServiceDto) {
    const message = await this.prismaService.message.create({
      data: {
        type: 'TEXT',
        userId: dto.userId,
        chatId: null,
        seenAt: new Date(),
        textMessage: {
          create: { content: dto.content },
        },
      },
      select: FEED_ITEM_SELECT,
    });

    return mapToFeedItem(message);
  }

  /**
   * Sets the absolute note rating
   */
  async setNoteRating(dto: SetFeedNoteRatingServiceDto) {
    await this.checkNoteAccess({
      userId: dto.userId,
      messageId: dto.messageId,
    });

    return this.prismaService.message.update({
      where: { id: dto.messageId },
      data: { rating: dto.rating },
      select: { id: true, rating: true },
    });
  }

  async deleteNote(dto: DeleteFeedNoteServiceDto) {
    await this.checkNoteAccess({
      userId: dto.userId,
      messageId: dto.messageId,
    });

    await this.prismaService.message.delete({
      where: { id: dto.messageId },
    });
  }
}
