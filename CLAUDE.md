# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Later" is a notes app built around chats. Users create chats, post notes (messages) into them, resolve notes, rate them, and work through stale notes in a feed. A dashboard shows stats about how fast notes are created and resolved.

It's a pnpm + Turborepo monorepo (Node >= 20.19, pnpm 9):

- `apps/api`: NestJS 11 API. Postgres goes through Prisma 7 (`@prisma/adapter-pg`), and MongoDB through Mongoose.
- `apps/web`: React 19 + Vite SPA, using Redux Toolkit / RTK Query, react-router 7, shadcn/ui (Tailwind 4), react-hook-form + zod, and recharts. Deployed to Vercel.
- `packages/types` (`@later/types`): request/response types shared by both apps. Its `exports` points at `src/index.ts`, so consumers read the source directly.

## Commands

From the root:

```sh
pnpm install
pnpm dev                             # turbo: api (port 3000) + web (port 5175)
pnpm build                           # turbo build, the same as CI
pnpm lint
pnpm check-types
pnpm --filter api exec prisma generate   # required before building/typing the api (CI does this)
pnpm --filter web run dev            # one app only
```

API (`apps/api`):

```sh
docker compose up -d                 # local Postgres 17 (5432) + Mongo 8 (27017)
pnpm db:migrate:local                # prisma migrate dev, using .env
pnpm test                            # jest unit tests (*.spec.ts under src/)
pnpm test -- src/chats/chats.service.spec.ts   # a single test file
pnpm test -- -t "name of test"       # a single test by name
pnpm test:e2e
```

The API needs `DATABASE_URL`, `MONGODB_URI`, `FRONTEND_URL`, `PORT`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `apps/api/.env`. The web app needs `VITE_BASE_URL` in `apps/web/.env`. Swagger is served at `/api/docs`.

CI (`.github/workflows/ci.yaml`) runs `prisma generate`, `turbo build` and `turbo lint`. Tests don't run in CI.

## Architecture

### API (`apps/api/src`)

- Every feature folder follows the same layout: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts` (class-validator), `*.types.ts`, `*.utils.ts` and `*.constants.ts`. Controllers return the `@later/types` response shapes, `{ message, data }` (see `BaseSuccessResponse` / `SuccessListResponse`).
- Routes have the global prefix `api` (except `health`), and controllers are versioned in their path, e.g. `@Controller('v1/feed')`.
- **Auth is global and on by default.** `AuthGuard` is registered as `APP_GUARD`. It reads a JWT from the `access_token` cookie and sets `req['user']`. Use `@Public()` to opt a route out. Controllers get the user id from `req['user']?.id`.
- The global `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted` + `transform`, so a DTO must declare every field the client sends.
- **Ownership checks** are service methods: `ChatsService.checkAccess` and `MessagesService.checkAccess` (the latter looks up the message joined to its chat). Every write path must call the matching one.
- **Two databases.** Postgres (Prisma, `prisma/schema.prisma`) holds the domain data: users, chats, messages, text_messages and message_resolutions. A "note" in the UI is a `Message` with a `TextMessage`. MongoDB holds analytics only:
  - `PerformanceInterceptor` (global `APP_INTERCEPTOR`) records the duration of every request through `PerformanceAnalyticsService`;
  - `UserActionsService.record` is called from the chats and messages services to log domain events. These events feed the stats/dashboard.
- The Prisma client is generated into `apps/api/generated/prisma` (gitignored) and imported as `generated/prisma/client`.
- `src/prisma/DEV__prisma.service.ts` is a drop-in `PrismaService` that logs every query with its inlined params to `logs/prisma-queries.log`. Swap it in by hand for SQL performance work. The write-ups in `sql/performance/` were produced this way; `sql/seeds/` has seed data.
- The feed (`GET v1/feed`) is **not idempotent**: it returns the stalest unseen notes and sets their `seenAt`.

### Web (`apps/web/src`)

- Feature-sliced layout: `features/<feature>/{api,components,hooks,pages,types,utils,const,slices,selectors}`. Cross-feature code lives in `shared/`, and layout lives in `widgets/`. The `@/` alias maps to `src/`.
- Pages are lazy-loaded in `App.tsx`. Authenticated routes are wrapped in `WithAuth` + `AppLayout`.
- Each feature has its own RTK Query `createApi`. All of them must be registered in `store.ts` (both the reducer and the middleware). They share `baseQueryWithCookies` (`shared/api/api.ts`), which sends cookies and, on a 401/403, calls `v1/auth/refresh` once behind a mutex, then retries.
- Feed cache rule: never refetch or invalidate the feed, because that marks more notes as seen. Mutations patch the `feed` infinite-query cache with `updateQueryData` instead (see `features/feed/api/feed.api.ts`).
- shadcn components live in `shared/components/ui` (aliases are set in `components.json`). After running `shadcn add`, check the generated files for a bogus `cn` import or dependency and fix it.
- Prettier settings: single quotes, trailing commas, 2-space indent.

## Workflow conventions

- Branches are named `<issue#>-<type>-<slug>` (e.g. `150-feature-add-deleting-notes-from-feed`), and PRs are squash-merged with that name.
- `brainstorm/<YYYYMMDDNN>__<branch-name>/` holds a feature's design notes:
  - `0__init.md` is the raw ask;
  - `1__requirements-and-plan.md` holds the agreed requirements and a file-by-file implementation plan.

  Read the matching folder before working on a feature, and follow the same format when planning a new one.
- Project skills (`domain-modeling`, `grilling`) live in `.claude/skills/`.
