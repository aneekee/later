## Requirements (agreed)

### Goal

- Drop MongoDB from the app entirely. Postgres (Prisma) becomes the only database.
- Performance analytics (`PerformanceInterceptor` → `PerformanceAnalyticsService`) keep working, but write to a new Postgres table.

### Existing data

- The prod Mongo `performance_events` collection is **discarded**. No export, import or archive.

### Data model

- A new Prisma model `PerformanceEvent`, `@@map("performance_events")`, that mirrors the Mongo document:
  - `id String @id @default(uuid())`
  - `target String` (e.g. `GET /api/v1/notes/:id`)
  - `params Json?` (jsonb, the query params object, the same as today)
  - `duration Float` (double precision, ms, fractional, the same as today)
  - `createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)`
- No relation to `users`, and **no indexes**: the table is write-only from the app, and you query it by hand. Add indexes later when a real query needs them.

### Write path

- Unchanged behaviour: one fire-and-forget insert per request from `PerformanceInterceptor`, with errors caught and `console.error`'d.
- `created_at` comes from the DB default. The service no longer sets it.
- No batching or buffering.

### Removals

- `apps/api/src/mongo/` (the `MongoModule`) and its import in `app.module.ts`.
- `apps/api/src/performance-analytics/performance-analytics.schema.ts` (the Mongoose schema).
- The `@nestjs/mongoose` and `mongoose` deps in `apps/api/package.json`, and the `mongoose` entry in the root `package.json` `pnpm.overrides`. Refresh `pnpm-lock.yaml`.
- The `mongodb` service and `mongodata` volume in `apps/api/docker-compose.yaml`.
- `scripts/transform-performance-events.js` (a one-off for Mongo exports).
- `MONGODB_URI` from `apps/api/.env` and `apps/api/.env.production.local`. Both are gitignored, so this is a local-only change.
- The Mongo mentions in `CLAUDE.md`.

### Out of scope

- Retention/cleanup of `performance_events`. The table grows by one row per request, so prune by hand or add a job in a separate issue.
- Batching writes.
- Any read API or dashboard for performance data.

## Implementation plan

1. **`apps/api/prisma/schema.prisma`**
   - Add the `PerformanceEvent` model above.
   - Run `pnpm db:migrate:local` with the name `create_performance_events_table`, then `pnpm --filter api exec prisma generate`.
2. **`apps/api/src/performance-analytics/performance-analytics.module.ts`**
   - Replace `MongooseModule.forFeature(...)` with `imports: [PrismaModule]`.
3. **`apps/api/src/performance-analytics/performance-analytics.service.ts`**
   - Inject `PrismaService` instead of the Mongoose model.
   - `record(dto)` → `await this.prisma.performanceEvent.create({ data: { target, params, duration } })` (no `createdAt`).
4. **`apps/api/src/performance-analytics/performance-analytics.types.ts`**
   - Keep `CreatePerformanceEventDto` as is. Only adjust the `params` typing if Prisma's `InputJsonValue` needs it.
5. **Delete** `apps/api/src/performance-analytics/performance-analytics.schema.ts` and `apps/api/src/mongo/mongo.module.ts` (the whole `mongo/` folder).
6. **`apps/api/src/app.module.ts`**
   - Remove the `MongoModule` import and its entry in `imports`.
7. **`apps/api/package.json`**
   - Remove `@nestjs/mongoose` and `mongoose`.
8. **Root `package.json`**
   - Remove the `"mongoose@>=9.0.0 <9.7.2"` override. Run `pnpm install` to update `pnpm-lock.yaml`.
9. **`apps/api/docker-compose.yaml`**
   - Remove the `mongodb` service and the `mongodata` volume.
10. **Delete** `scripts/transform-performance-events.js` (and `scripts/` if it ends up empty).
11. **`apps/api/.env`, `apps/api/.env.production.local`** (local, gitignored)
    - Remove `MONGODB_URI`.
12. **`CLAUDE.md`**
    - Overview: drop "and MongoDB through Mongoose".
    - Commands: the `docker compose up -d` comment → "local Postgres 17 (5432)".
    - The env list: drop `MONGODB_URI`.
    - Architecture: replace "Two databases." with a single-database note saying `PerformanceInterceptor` records request durations to the Postgres `performance_events` table through `PerformanceAnalyticsService`.
13. **Verify**
    - `pnpm --filter api exec prisma generate`, `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm --filter api test`.
    - `grep -ri mongo` over the repo (excluding `brainstorm/` and the lockfile history) returns nothing.
    - Run the API locally against Postgres only, hit a few routes, and check that rows appear in `performance_events`.

## Rollout checklist (by hand, prod)

1. Run `pnpm --filter api db:migrate:prod` **before** deploying, because prod migrations aren't automatic. If the deploy goes first, inserts fail and are only logged, and requests aren't affected.
2. Deploy the API.
3. Check that new rows land in `performance_events`.
4. Remove `MONGODB_URI` from the Railway API service env.
5. Delete the Railway MongoDB service (its data is discarded by design).
