I want to adjust the current implementation of the burndown chart -- it should show numbers of total created notes and resolved notes, not resolved and unresolved numbers, so the unresolved count could never be greater than the total

---

## Requirements (agreed)

- **Chart lines**: two cumulative lines, one point per day over the last 90 days.
  - **Total** = notes created up to the end of that day.
  - **Resolved** = notes resolved up to the end of that day.
  - Resolved can never exceed Total; the gap between them is the unresolved backlog.
- **Unchanged**: deleted notes are excluded, history is rebuilt from current state, days follow the browser timezone, the window is 90 days.
- **API**: burndown point = `{ day, total, resolved }` (`unresolved` dropped).
- **Chart style**: still two lines. Total uses the foreground colour, Resolved the mid-grey.
- **Labels**: subtitle "Total created and resolved notes over the last 3 months", legend Total / Resolved.
- **Stat cards**: unchanged (Total / Unresolved / Resolved).

## Implementation plan

1. `packages/types/src/stats.ts`: `NotesBurndownPoint` = `{ day, total, resolved }`.
2. `apps/api/src/stats/stats.service.ts`: map the running totals to `total` / `resolved`; the SQL is unchanged.
3. `NotesBurndownChart.tsx`: rename the `unresolved` key to `total` (label "Total").
4. `NotesBurndownContainer.tsx`: empty state when no point has `total > 0`; new subtitle.
5. Verify: tsc + lint, call the endpoint, check the chart in the browser.
