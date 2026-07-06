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

## Status

MVP shipped 2026-07-05: spine schema, GotA adapter, live validation (caught
the real `gota-006` duplicate-id defect), and a clean import→export
round-trip. Browser-dogfooded twice.

2026-07-06: **Counters tab** — APP-6/MIL-STD-2525 unit symbols via vendored
milsymbol (MIT, `src/vendor/`), SPI-style counter geometry (centered symbol
box, large bottom factor row), faction-color squares with luminance-picked
icon contrast. **Light mode** — drafting-paper theme, toggle in the top
chrome, persisted to localStorage with OS-preference fallback. Design
register + mockups live under `opendesign/` (design-system project:
"Musterwright — Muster Desk" on Claude Design). Next up: TWU + NaB adapters
and the Phase 2 counter-graphics generator (print/export path).

## Quick start

No build step. Serve the repo root with any static file server, e.g.:

```
python3 -m http.server
```

then open `index.html` in a browser. Run the test suite with:

```
npm test
```

Real game data goes in the gitignored `local/gota/source/` (not committed —
this repo carries only the tool and synthetic fixtures).
