# A note's tier is a staleness boost, not a sort key

The feed orders notes by how long ago they were last seen, multiplied by the note's tier factor: S ×16, A ×8, B ×4, C ×2, D ×1. It does not serve all S notes before any A note. The feed always serves something, so a strict tier sort would starve the lower tiers once there's a page's worth of S notes. With a boost, every note keeps rotating and higher tiers just come back sooner (#151). A just served note has no staleness to multiply, so it goes to the back whatever its tier. The factors double per tier, so the gaps stay meaningful and there's room at both ends for future tiers (e.g. SSS ×32, F ×0.5).

## Considered Options

- **Strict sort (`ORDER BY tier, seen_at`)**: rejected because it starves the lower tiers, as above.
- **Tier as a revisit interval** (a note is due once `seen_at + interval` has passed): rejected as a different mental model that needs more design for no gain over the boost.
- **A fixed shift of `seen_at` (S 8 weeks, A 4, B 2, C 1, D none)**: shipped first in #151, replaced before merge. A just served S note still counted as 8 weeks stale, so it beat every note seen in the last 8 weeks and came back on the next page; with a page's worth of S notes the feed looped on them.
- **A per-session cursor that skips notes served since the feed was opened**: rejected because it only hides the repeats within one session, and the fixed shift stays wrong across sessions.
- **Linear factors (S ×5 … D ×1)**: rejected because the top tiers feel too alike.
