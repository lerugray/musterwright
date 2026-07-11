# musterwright

Musterwright is an order-of-battle (OOB) / unit editor for hex-and-counter
wargame development: build and edit unit rosters, factor sets, pooled
strength, and faction notes; validate them against a per-game schema profile;
and export the exact JSON a game engine consumes. It is the forces/OOB
sibling of [hexwright](https://github.com/lerugray/hexwright) (the map layer)
in wright-kit, a wargame construction kit.

Zero-build vanilla JS local web app. Real game data lives in gitignored
`local/` — this repo carries only the tool, synthetic test fixtures, and a
small example project.

- Design basis: `docs/DESIGN.md`

## Status

MVP shipped 2026-07-05: spine schema, GotA adapter, live validation (caught
the real `gota-006` duplicate-id defect), and a clean import→export
round-trip. Browser-dogfooded twice.

2026-07-06: **Counters tab** — APP-6/MIL-STD-2525 unit symbols via vendored
milsymbol (MIT, `src/vendor/`), SPI-style counter geometry (centered symbol
box, large bottom factor row), faction-color squares with luminance-picked
icon contrast. **Light mode** — drafting-paper theme, toggle in the top
chrome, persisted to localStorage with OS-preference fallback. Design
register + mockups live under `opendesign/`. Next up: TWU + NaB adapters
and the Phase 2 counter-graphics generator (print/export path).

## Quick start

No build step. Serve the repo root with any static file server, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/` in a browser. Run the test suite with:

```
npm test
```

## Try it — example project

A small synthetic project ships in `examples/bridgetown-1866/`: a fictional
two-faction 1866 skirmish over the Bridgetown crossing — six roster units,
two artillery assets, and a strength-point pool per faction, in the same
three-file format (`oob.json`, `assets.json`, `sp_pools.json`) the app's
adapter consumes. With the server running, open:

```
http://localhost:8000/index.html?project=examples/bridgetown-1866
```

The Roster, Assets, SP Pools, Validation, and Counters tabs all populate
from it. Edit factors inline, watch validation update live, and use the
export buttons to write the three JSON files back out.

Real game data goes in the gitignored `local/<game>/source/` (not committed —
this repo carries only the tool, synthetic fixtures, and the example).
