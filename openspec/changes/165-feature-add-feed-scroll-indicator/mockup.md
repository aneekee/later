# Mockup: feed scroll counter

UI reference for this change, made with Claude Design. This is an input like `ask.md`, not an OpenSpec artifact; the behavior lives in the specs.

- Canvas: https://claude.ai/artifact/K7QipimyQu9XH5C3grYUea (private to the owner)
- Exported artboards: `mockup/*.png`, one per artboard (see the list at the end)
- Chosen variant: **A, in the Feed title row, with progress bar F** (the bar fills the title row's free space, next to the count). It's the answer to the 2026-11-18 update in `ask.md`.
- Rejected, kept on the canvas for reference:
  - B: a pill next to the title plus a progress line under the whole header.
  - C: the counter in the app top bar.
  - D: a short 64 px bar before the count.
  - E: an 80 px bar under the count.

## Placement

The counter sits in the feed's own sticky header (`FeedContainer`), in the same 48 px row as the "Feed" title. The bar takes the row's free space between the title and the count. It's the same on phone and desktop. The note input row below it doesn't change, and neither does the header height.

```
+--------------------------------------+
| [=]                                  |  app top bar (unchanged)
+--------------------------------------+
|  Feed  ━━━━━━━━━━━──────────  12/300 |  title row: h1, then the counter group (bar + count)
|  [ Add a note...              ] [>]  |  note input (unchanged)
+--------------------------------------+
|  card                                |

Round 2:
|  Feed  [Round 2] ─────────────  1/300 |
```

- Row: `flex items-center justify-between gap-3`, the title on the left, then the counter group.
- Counter group: `flex min-w-0 flex-1 items-center gap-2 ml-2`. It holds the optional round pill, then the bar, then the count. `ml-2` plus the row's `gap-3` keeps the bar 20 px from "Feed", so the bar reads as part of the counter and not as a rule under the title.
- Bar: the shadcn `Progress` (`shared/components/ui/progress.tsx`, added with `shadcn add progress`) with `className="flex-1 min-w-12"` and `value={scrolled / total * 100}`. It's vertically centered in the row.
- Bar width: about 225 px on a 375 px phone (about 155 px with the round pill) and about 450 px in the 600 px desktop column. At least 48 px.

## Look

| Part | Light | Dark | Notes |
|---|---|---|---|
| Count `12/300` | `muted-foreground` (#737373) | `muted-foreground` (#a1a1a1) | 14 px (`text-sm`), weight 500, `tabular-nums`, no spaces around `/` |
| Round pill `Round 2` | text #404040 on `muted` (#f5f5f5) | text #d4d4d4 on `muted` (#262626) | 12 px (`text-xs`), weight 500, `rounded-full`, padding 2 px × 8 px (`px-2 py-0.5`). Text must reach 4.5:1 on the pill, so don't use `muted-foreground` for it (#737373 on #f5f5f5 is about 4.3:1) |
| Bar track | `muted` (#f5f5f5) | `muted` (#262626) | The plain shadcn Progress (radix-nova): 4 px (`h-1`), `rounded-full`. On the white header the light track is barely visible (about 1.1:1); only the fill reads. In dark mode the whole track shows as a faint line |
| Bar fill | `primary` (#171717) | `primary` (#e5e5e5) | Width = scrolled / total. About 9 px at `12/300` on a phone, 18 px on desktop |

- The pill shows from round 2 on, before the bar: `Round 2`, `Round 3`, …. Round 1 has no pill.
- No icon and no label word: the text is just the numbers.
- When a new round starts, the bar goes back to nearly empty (`1/300`).
- The text doesn't animate: it just changes. Tabular figures keep the width steady while digits change.
- The bar keeps the plain Progress's `transition-all`: its fill slides for about 150 ms on each change, and back to nearly empty when a round starts (design.md Decision 13).
- The bar is hidden from screen readers (`aria-hidden`); they read only the count text (design.md Decision 9).

## States

The counter group in each state. The states are drawn, in light and dark, on the "F · Track fills the title row" artboard.

| State | Shows |
|---|---|
| First page loading, first page failed, or 0 notes | nothing: the title row has only "Feed" (no count, no bar) |
| Round 1, scrolling | bar at 4%, `12/300` |
| After deleting a scrolled note (from 12/300) | bar at 3.7%, `11/299` |
| After creating a note (from 12/300) | bar at 4%, `12/301` |
| Almost full | bar at 99% (looks full), `298/300` |
| Every note scrolled | full bar, `300/300`, held until a repeated note counts |
| Round 2 starts | `Round 2` pill, bar at 0.3% (a hairline), `1/300` |
| A later round | `Round 3` pill, bar at 29%, `87/300` |
| 10 or fewer notes, end of feed | full bar, `8/8`, no round 2 |
| Small total | bar at 37.5%, `3/8` |
| Large total | bar at 0.5% (about 1 px on a phone), `12/2400` |
| Next page failed | the counter and the bar stay as they were |

At 1–2% the fill is a sliver in any layout, and 99% looks full. The count text gives the exact value.

## Artboards on the canvas

| Artboard | What it shows |
|---|---|
| A · In the Feed title row (chosen) | phone 390×844, light, round 1, `12/300`, without the bar |
| A · Dark, round 2 | phone 390×844, dark, `Round 2` + `42/300`, without the bar |
| Counter states (A) | the title row in every state, without the bar |
| Desktop · A | 1280×800 with the sidebar, the 600 px feed column, `12/300`, without the bar |
| F · Track fills the title row (chosen) | phone crop 375 px and desktop 600 px column, both in light and dark; the states `12/300`, `298/300`, `300/300`, `Round 2` + `1/300`, `3/8` and `12/2400` in light and dark |
| B · Pill + progress line | rejected |
| C · In the app top bar | rejected |
| D · Short track before the count | rejected bar option |
| E · Track under the count | rejected bar option |

A's artboards give the placement, the count and the pill. F gives the bar. The phone, desktop and F artboards have `scrolled`, `total` and `round` controls in the canvas's Tweaks tab for trying other values.

## PNG exports (`mockup/`)

Exported from the canvas by the owner, one PNG per artboard, named after it:

- `mockup/A · In the Feed title row (chosen).png`: the reference for light mode (placement, count)
- `mockup/A · Dark, round 2.png`: the reference for dark mode and the round pill
- `mockup/Counter states (A).png`: the reference for every state's text
- `mockup/Desktop · A.png`: the reference for desktop
- `mockup/F · Track fills the title row.png`: the reference for the bar on phone and desktop, in light and dark, and in each state
- `mockup/B · Pill + progress line.png` and `mockup/C · In the app top bar.png`: rejected variants, kept for the record
- `mockup/D · Short track before the count.png` and `mockup/E · Track under the count.png`: rejected bar options, kept for the record
