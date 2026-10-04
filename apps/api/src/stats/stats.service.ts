import { Injectable } from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';

import { NotesGap, NotesPeriodStats } from '@later/types';

import { NOTES_BURNDOWN_DAYS, NOTES_STATS_PERIOD_DAYS } from './stats.const';
import {
  GetNotesBurndownServiceDto,
  GetNotesTotalsServiceDto,
  NotesBurndownPointDb,
  NotesGapKind,
  NotesPeriodCountsDb,
  NotesPeriodGapDb,
  NotesTotalsDb,
} from './stats.types';

@Injectable()
export class StatsService {
  constructor(private prismaService: PrismaService) {}

  async getNotesTotals(dto: GetNotesTotalsServiceDto) {
    const [[row], periods] = await Promise.all([
      this.prismaService.$queryRaw<NotesTotalsDb[]>(
        Prisma.sql`
        SELECT
          COUNT(*) AS total,
          COUNT(mr.id) AS resolved
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        LEFT JOIN message_resolutions mr ON mr.message_id = m.id
        WHERE c.user_id = ${dto.userId}
      `,
      ),
      this.getNotesPeriods(dto),
    ]);

    const total = Number(row.total);
    const resolved = Number(row.resolved);

    return { total, resolved, unresolved: total - resolved, periods };
  }

  /**
   * Rolling-window changes and gaps, reconstructed from current data:
   * deleted notes and earlier resolve/unresolve cycles are not represented.
   */
  private async getNotesPeriods(
    dto: GetNotesTotalsServiceDto,
  ): Promise<NotesPeriodStats[]> {
    const [countRows, gapRows] = await Promise.all([
      this.prismaService.$queryRaw<NotesPeriodCountsDb[]>(
        Prisma.sql`
          WITH periods AS (
            SELECT unnest(${NOTES_STATS_PERIOD_DAYS}::int[]) AS days
          ),
          user_notes AS (
            SELECT m.created_at, mr.created_at AS resolved_at
            FROM messages m
            JOIN chats c ON c.id = m.chat_id
            LEFT JOIN message_resolutions mr ON mr.message_id = m.id
            WHERE c.user_id = ${dto.userId}
          )
          SELECT
            p.days,
            COUNT(*) FILTER (
              WHERE n.created_at > now() - make_interval(hours => p.days * 24)
            ) AS created,
            COUNT(*) FILTER (
              WHERE n.resolved_at > now() - make_interval(hours => p.days * 24)
            ) AS resolved
          FROM periods p
          LEFT JOIN user_notes n ON true
          GROUP BY p.days
        `,
      ),
      this.prismaService.$queryRaw<NotesPeriodGapDb[]>(
        Prisma.sql`
          WITH periods AS (
            SELECT unnest(${NOTES_STATS_PERIOD_DAYS}::int[]) AS days
          ),
          user_notes AS (
            SELECT m.created_at, mr.created_at AS resolved_at
            FROM messages m
            JOIN chats c ON c.id = m.chat_id
            LEFT JOIN message_resolutions mr ON mr.message_id = m.id
            WHERE c.user_id = ${dto.userId}
          ),
          events AS (
            SELECT 'creation' AS kind, created_at AS at FROM user_notes
            UNION ALL
            SELECT 'resolution' AS kind, resolved_at AS at FROM user_notes
            WHERE resolved_at IS NOT NULL
          ),
          -- only consecutive pairs with both events inside the window count
          gaps AS (
            SELECT
              p.days,
              e.kind,
              EXTRACT(EPOCH FROM e.at - LAG(e.at) OVER (
                PARTITION BY p.days, e.kind ORDER BY e.at
              ))::float8 * 1000 AS gap_ms
            FROM periods p
            JOIN events e ON e.at > now() - make_interval(hours => p.days * 24)
          )
          SELECT
            days,
            kind,
            AVG(gap_ms) AS "avgMs",
            percentile_cont(0.5) WITHIN GROUP (ORDER BY gap_ms) AS "medianMs"
          FROM gaps
          WHERE gap_ms IS NOT NULL
          GROUP BY days, kind
        `,
      ),
    ]);

    const findGap = (days: number, kind: NotesGapKind): NotesGap | null => {
      const gap = gapRows.find((r) => r.days === days && r.kind === kind);

      return gap
        ? { avgMs: Math.round(gap.avgMs), medianMs: Math.round(gap.medianMs) }
        : null;
    };

    return NOTES_STATS_PERIOD_DAYS.map((days) => {
      const counts = countRows.find((r) => r.days === days);
      const created = Number(counts?.created ?? 0);
      const resolved = Number(counts?.resolved ?? 0);

      return {
        days,
        unresolvedDelta: created - resolved,
        resolvedDelta: resolved,
        creationGap: findGap(days, 'creation'),
        resolutionGap: findGap(days, 'resolution'),
      };
    });
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
