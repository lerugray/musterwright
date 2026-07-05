# musterwright

Order-of-battle / unit editor for hex-and-counter wargame development — the
force layer of a digital wargame design stack (sibling of hexwright, the map
layer). Build and edit unit rosters, factor sets, pooled strength, formations,
and reinforcement schedules; validate them against a per-game profile; export
the exact JSON a game engine consumes.

Zero-build vanilla JS local web app. Real game data lives in gitignored
`local/` — this repo carries only the tool and synthetic test fixtures.

- Design basis: `docs/DESIGN.md`
- Current build brief: `docs/handoffs/mvp-build-brief.md`
