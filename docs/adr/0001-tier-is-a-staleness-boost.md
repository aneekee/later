# A note's tier is a staleness boost, not a sort key

The feed orders notes by when they were last seen, moved earlier by the note's tier: S 8 weeks, A 4, B 2, C 1, D none. It does not serve all S notes before any A note. The feed always serves something, so a strict tier sort would starve the lower tiers once there's a page's worth of S notes. With a boost, every note keeps rotating and higher tiers just come back sooner (#151). The boosts roughly double per tier, so the gaps stay meaningful and there's room at both ends for future tiers (e.g. SSS 16 weeks, F negative).

## Considered Options

- **Strict sort (`ORDER BY tier, seen_at`)**: rejected because it starves the lower tiers, as above.
- **Tier as a revisit interval** (a note is due once `seen_at + interval` has passed): rejected as a different mental model that needs more design for no gain over the boost.
- **Linear weekly boosts (S 4 weeks … D 0)**: rejected because the top tiers feel too alike.
