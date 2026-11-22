import { Injectable } from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { NOTE_SELECT, mapToNoteEntity } from 'src/notes/notes.utils';

import { GetFeedServiceDto } from './feed.types';
import {
  buildFeedOrderSql,
  buildFeedWhere,
  buildFeedWhereSql,
} from './feed.utils';

@Injectable()
export class FeedService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Returns the next feed page and marks it as seen,
   * so the next call returns the following notes.
   * With `since` (the visit's start, the first page's servedAt), notes already
   * served in the visit are skipped: the tier factor can rank a just-served
   * high-tier note above an older low-tier one within seconds.
   */
  async getNextPage(dto: GetFeedServiceDto) {
    const servedAt = new Date();
    const visitStart = dto.since ?? servedAt;

    return this.prismaService.$transaction(async (tx) => {
      // the order is an expression, Prisma orderBy can't express it
      const rows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT n.id FROM notes n
          ${buildFeedWhereSql(dto.userId, dto.since)}
          ${buildFeedOrderSql()}
          LIMIT ${dto.pageSize}
        `,
      );
      const ids = rows.map((row) => row.id);

      const notes = await tx.note.findMany({
        where: { id: { in: ids } },
        select: NOTE_SELECT,
      });
      const noteById = new Map(notes.map((n) => [n.id, n]));
      const orderedNotes = ids.flatMap((id) => noteById.get(id) ?? []);

      await tx.note.updateMany({
        where: { id: { in: ids } },
        data: { seenAt: servedAt },
      });

      const total = await tx.note.count({
        where: buildFeedWhere(dto.userId),
      });
      // after the update, so this page's notes don't count
      const left = await tx.note.count({
        where: buildFeedWhere(dto.userId, visitStart),
      });

      return {
        items: orderedNotes.map(mapToNoteEntity),
        total,
        servedAt: servedAt.toISOString(),
        left,
      };
    });
  }
}
