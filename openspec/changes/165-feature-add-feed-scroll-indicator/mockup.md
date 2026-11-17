# Mockup: feed scroll counter

UI reference for this change, made with Claude Design. This is an input like `ask.md`, not an OpenSpec artifact; the behavior lives in the specs.

- Canvas: https://claude.ai/artifact/K7QipimyQu9XH5C3grYUea (private to the owner)
- Exported artboards: `mockup/*.png`, one per artboard (see the list at the end)
- Chosen variant: **A, in the Feed title row**. B (a pill next to the title plus a progress line under the header) and C (in the app top bar) were rejected and stay on the canvas for reference.

## Placement

The counter sits in the feed's own sticky header (`FeedContainer`), in the same 48 px row as the "Feed" title, aligned right. It's the same on phone and desktop. The note input row below it doesn't change, and neither does the header height.

```
+--------------------------------------+
| [=]                                  |  app top bar (unchanged)
+--------------------------------------+
|  Feed                [Round 2] 1/300 |  title row: h1 left, counter right
|  [ Add a note...              ] [>]  |  note input (unchanged)
+--------------------------------------+
|  card                                |
```

- Row: `flex items-center justify-between gap-3`, title on the left, counter group on the right.
- Counter group: `flex items-center gap-2` holding the optional round pill, then the count.

## Look

| Part | Light | Dark | Notes |
|---|---|---|---|
| Count `12/300` | `muted-foreground` (#737373) | `muted-foreground` (#a1a1a1) | 14 px (`text-sm`), weight 500, `tabular-nums`, no spaces around `/` |
| Round pill `Round 2` | text #404040 on `muted` (#f5f5f5) | text #d4d4d4 on `muted` (#262626) | 12 px (`text-xs`), weight 500, `rounded-full`, padding 2 px × 8 px (`px-2 py-0.5`). Text must reach 4.5:1 on the pill, so don't use `muted-foreground` for it (#737373 on #f5f5f5 is about 4.3:1) |

- The pill shows from round 2 on, before the count: `Round 2`, `Round 3`, …. Round 1 has no pill.
- No icon, no progress bar, no label word: the text is just the numbers.
- No animation: the text just changes. Tabular figures keep the width steady while digits change.

## States

Each one is drawn on the "Counter states (A)" artboard.

| State | Shows |
|---|---|
| First page loading, first page failed, or 0 notes | nothing: the title row has only "Feed" |
| Round 1, scrolling | `12/300` |
| After deleting a scrolled note (from 12/300) | `11/299` |
| After creating a note (from 12/300) | `12/301` |
| Every note scrolled | `300/300`, held until a repeated note counts |
| Round 2 starts | `Round 2` pill + `1/300` |
| A later round | `Round 3` pill + `87/300` |
| 10 or fewer notes, end of feed | `8/8`, no round 2 |
| Next page failed | the counter stays as it was |

## Artboards on the canvas

| Artboard | What it shows |
|---|---|
| A · In the Feed title row (chosen) | phone 390×844, light, round 1, `12/300` |
| A · Dark, round 2 | phone 390×844, dark, `Round 2` + `42/300` |
| Counter states (A) | the title row in every state from the table above |
| Desktop · A | 1280×800 with the sidebar, the 600 px feed column, `12/300` |
| B · Pill + progress line | rejected |
| C · In the app top bar | rejected |

The phone and desktop artboards have `scrolled`, `total` and `round` controls in the canvas's Tweaks tab for trying other values.

## PNG exports (`mockup/`)

Exported from the canvas by the owner, one PNG per artboard, named after it:

- `mockup/A · In the Feed title row (chosen).png`: the reference for light mode
- `mockup/A · Dark, round 2.png`: the reference for dark mode and the round pill
- `mockup/Counter states (A).png`: the reference for every state
- `mockup/Desktop · A.png`: the reference for desktop
- `mockup/B · Pill + progress line.png` and `mockup/C · In the app top bar.png`: rejected variants, kept for the record
