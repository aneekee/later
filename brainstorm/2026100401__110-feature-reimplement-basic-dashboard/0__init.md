I want to add some basic analytics to my notes taking app

I want to show the following data:

- number of total notes created by the current user
- number of unresolved notes
- number of resolved notes

I also want to display a burndown chart showing numbers of resolved and unresolved notes
It should show data for the last 3 months

This is the page where I want to show these analytics /Users/akava/Documents/work/later/apps/web/src/features/home/pages/Home.page.tsx

I don't want to add any cache tables, the stats should be computed from the postgres data, as a single source of truth

---

## Requirements (agreed)

- **Scope**: "my notes" = messages in chats I own (`chats.user_id`); no sharing.
- **Resolved** = a `message_resolutions` row exists; **unresolved** = none.
- **Deleted notes**: hard-deleted, so they vanish from everything, history included.
- **History**: reconstructed from current state (no transition log). A re-resolved note counts from its latest resolve date. No schema changes, no cache tables.
- **Cards**: Total / Unresolved / Resolved (live counts).
- **Chart**: rolling 90 days ending today, daily points, two lines (Unresolved, Resolved).
  - Unresolved(D) = created ≤ end of D and (no resolution or resolved after D).
  - Resolved(D) = resolution ≤ end of D.
  - Day buckets in the browser's IANA timezone, computed in Postgres.
- **API**: two endpoints. Burndown is fixed at 90 days, param `timezone` only; invalid timezone → 400.
- **UI**: on Home, a cards row above a full-width chart, replacing "Dashboard coming soon". Skeletons, error with Retry, empty state when 0 notes.
- **Freshness**: refetch on every Home mount (`keepUnusedDataFor: 0`). No polling, no focus refetch, no cross-API invalidation.
- **Out of scope**: perf verification on the seed (done by the author), automated tests (manual check only).

## Implementation plan

1. `packages/types/src/stats.ts`: `NotesTotals`, `NotesBurndownPoint`, success responses; export from index.
2. `apps/api/src/stats/` module (registered in `app.module.ts`):
   - `@Controller('v1/stats/notes')` with `GET /totals` and `GET /burndown?timezone=`.
   - DTO validates the IANA timezone.
   - Service uses `$queryRaw`:
     - totals = count over messages ⋈ chats ⟕ resolutions;
     - burndown = generate_series of 90 local days, daily deltas, running `SUM() OVER`, seeded with pre-window counts.
3. `apps/web/src/features/home/api/stats.api.ts` (RTK Query), registered in `store.ts`; timezone from `Intl`.
4. Components:
   - `NotesStats/` (container + cards);
   - `NotesBurndown/` (container + recharts LineChart via `shared/components/ui/chart.tsx`).
5. `Home.page.tsx` renders cards + chart.
6. Manual verification: Swagger, invalid tz → 400, resolve/unresolve/delete flows, empty state, browser preview (incl. mobile).
