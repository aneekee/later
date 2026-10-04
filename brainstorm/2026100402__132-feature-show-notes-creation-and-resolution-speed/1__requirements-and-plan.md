## Requirements (agreed)

- **Data source**: current Postgres state only (same approach as the burndown). Mongo `user_actions` are not used. Deleted notes are excluded; earlier resolve/unresolve cycles are not represented.
- **Windows**: rolling 24h / 7d / 30d back from now. No timezone involved.
- **Unresolved Δ** = unresolved now − unresolved at `now − N`.
  - A note was unresolved at time T if it was created ≤ T and has no resolution, or its resolution came after T.
  - Equivalent to: notes created in the window − resolutions in the window.
- **Resolved Δ** = resolutions with `created_at` inside the window.
- **Creation gap**: avg and median time between consecutive notes' `created_at`, using only pairs where both events are inside the window.
- **Resolution gap**: the same, using `message_resolutions.created_at`.
- A window with fewer than 2 events has a `null` gap, rendered as "—".

### UI

- Still the existing 3 cards; **Total** is unchanged.
- **Unresolved** card: big number, then a _Change_ block with 3 chips (24h / 7d / 30d), then a _Creation gap_ block with 3 chips, each showing avg with median (muted) below it.
- **Resolved** card: the same layout, with the _Resolution gap_ block.
- **Delta chips**: signed (`+5`, `−2`, `0`) and semantically colored:
  - Unresolved going down is green, going up is red.
  - Resolved going up is green, going down is red.
  - 0 is grey.
- **Durations**: the two largest units, e.g. `3h 20m`, `2d 4h`, `45s`.

### API

- Extend `GET v1/stats/notes/totals`; `data` gains:

```ts
periods: {
  days: 1 | 7 | 30;
  unresolvedDelta: number;
  resolvedDelta: number;
  creationGap: { avgMs: number; medianMs: number } | null;
  resolutionGap: { avgMs: number; medianMs: number } | null;
}[];
```

## Implementation plan

1. `packages/types/src/stats.ts`: add `NotesGap` and `NotesPeriodStats`, and add `periods` to `NotesTotals`.
2. `apps/api/src/stats/`:
   - Add `NOTES_STATS_PERIOD_DAYS = [1, 7, 30]` to `stats.const.ts`.
   - Add a raw SQL query that computes the per-window counts (created / resolved in window) with `COUNT(*) FILTER (...)`.
   - Add a raw SQL gap query: `LAG()` over the events in each window, then `AVG` and `percentile_cont(0.5)` per window, for both creations and resolutions.
   - Add matching `*Db` types in `stats.types.ts`, and map `bigint` and interval values to numbers (ms) in `getNotesTotals`.
3. Web:
   - `apps/web/src/shared/utils/date.util.ts`: add `formatDuration(ms)` (two largest units).
   - `NotesStatsCard.tsx`: add optional `deltas` and `gaps` blocks (chips per period), plus a "good direction" flag for delta colors.
   - `NotesStatsContainer.tsx`: pass `periods` to the Unresolved card (creation gap) and the Resolved card (resolution gap), and make the loading skeleton taller.
4. Verify:
   - Run tsc and lint for api, web and types.
   - Call the endpoint and check the numbers against a manual SQL count on the dev DB.
   - Check the cards in the browser in light and dark mode and at mobile width.
