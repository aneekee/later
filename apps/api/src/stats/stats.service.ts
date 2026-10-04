import { Injectable } from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';

import { NOTES_BURNDOWN_DAYS } from './stats.const';
import {
  GetNotesBurndownServiceDto,
  GetNotesTotalsServiceDto,
  NotesBurndownPointDb,
  NotesTotalsDb,
} from './stats.types';

@Injectable()
export class StatsService {
  constructor(private prismaService: PrismaService) {}

  async getNotesTotals(dto: GetNotesTotalsServiceDto) {
    const [row] = await this.prismaService.$queryRaw<NotesTotalsDb[]>(
      Prisma.sql`
        SELECT
          COUNT(*) AS total,
          COUNT(mr.id) AS resolved
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        LEFT JOIN message_resolutions mr ON mr.message_id = m.id
        WHERE c.user_id = ${dto.userId}
      `,
    );

    const total = Number(row.total);
    const resolved = Number(row.resolved);

    return { total, resolved, unresolved: total - resolved };
  }

  /**
   * Reconstructs the daily state from current data: deleted notes and
   * earlier resolve/unresolve cycles are not represented.
   */
  async getNotesBurndown(dto: GetNotesBurndownServiceDto) {
    const tz = dto.timezone;
    const daysBack = NOTES_BURNDOWN_DAYS - 1;

    const rows = await this.prismaService.$queryRaw<NotesBurndownPointDb[]>(
      Prisma.sql`
        WITH bounds AS (
          SELECT
            (now() AT TIME ZONE ${tz})::date - ${daysBack}::int AS from_day,
            (now() AT TIME ZONE ${tz})::date AS to_day
        ),
        user_notes AS (
          SELECT
            (m.created_at AT TIME ZONE ${tz})::date AS created_day,
            (mr.created_at AT TIME ZONE ${tz})::date AS resolved_day
          FROM messages m
          JOIN chats c ON c.id = m.chat_id
          LEFT JOIN message_resolutions mr ON mr.message_id = m.id
          WHERE c.user_id = ${dto.userId}
        ),
        -- everything before the window collapses onto from_day so that the
        -- running sum starts from the correct baseline
        events AS (
          SELECT GREATEST(created_day, b.from_day) AS day, 1 AS created, 0 AS resolved
          FROM user_notes, bounds b
          UNION ALL
          SELECT GREATEST(resolved_day, b.from_day) AS day, 0 AS created, 1 AS resolved
          FROM user_notes, bounds b
          WHERE resolved_day IS NOT NULL
        ),
        daily AS (
          SELECT day, SUM(created) AS created, SUM(resolved) AS resolved
          FROM events
          GROUP BY day
        ),
        days AS (
          SELECT generate_series(b.from_day, b.to_day, interval '1 day')::date AS day
          FROM bounds b
        )
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          SUM(COALESCE(daily.created, 0)) OVER (ORDER BY d.day) AS "createdCum",
          SUM(COALESCE(daily.resolved, 0)) OVER (ORDER BY d.day) AS "resolvedCum"
        FROM days d
        LEFT JOIN daily ON daily.day = d.day
        ORDER BY d.day
      `,
    );

    return rows.map((row) => ({
      day: row.day,
      total: Number(row.createdCum),
      resolved: Number(row.resolvedCum),
    }));
  }
}
