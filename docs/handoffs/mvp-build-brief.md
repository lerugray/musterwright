# MVP build brief — edit + validate + export, GotA adapter first

ONE deliverable: the musterwright MVP per `docs/DESIGN.md` (read it first,
fully). Zero-build vanilla JS local web app, runnable end-to-end.

## Conventions reference (read-only)

Read the sibling repo `/Users/rayweiss/Desktop/Dev Work/hexwright` — it is
the conventions reference: repo layout, zero-build ES-module structure, how
the app is served/launched, how `local/` project data is loaded and saved,
the `verify/` suite shape, autosave handling. Mirror its idioms; do not
invent a different architecture. Do NOT modify hexwright.

## Reference consumer data (read-only)

The first adapter's real data lives in
`/Users/rayweiss/Desktop/Dev Work/guns-of-the-americas/data/oob/`:
`oob.json` (unit roster: id/faction/sp/dv/mp/type/size), `assets.json`
(asset counters: id/av/dv/mp/type/size), `sp_pools.json` (per-faction
`sp_count`, `av_per_sp`, notes). Do NOT modify that repo. Copy the three
files into `local/gota/source/` here (gitignored) for development use.

## Scope (this batch)

1. **App shell** (`index.html` + `src/`): project open/create (GotA profile
   built in), tabbed surfaces for Roster / Assets / Pools / Validation.
   Table-first editing: sortable columns, inline cell editing, add/delete
   row, keyboard-friendly. Plain ES modules, no framework, no build step.
2. **Spine schema + GotA adapter** (`src/schema/`, `src/adapters/gota.js`):
   import the three GotA files into the spine; export back out. The adapter
   owns all GotA-shape knowledge; the spine stays game-agnostic per
   DESIGN.md (extensible factor map — GotA's factors are av/dv/mp/sp).
3. **Validation panel** (`src/validate.js`): duplicate ids (case/whitespace
   tolerant), missing/extra fields vs the GotA profile, cross-file
   consistency (roster↔assets id collisions), pool derivation checks
   (derived per-SP values recomputed + shown, manual override allowed and
   marked), unknown-field warnings. Validation runs live and lists findings
   with row links.
4. **Round-trip acceptance**: import GotA source → export → semantically
   identical (key order and formatting may differ ONLY if a normalizer
   proves equivalence; document any intentional normalization in
   `docs/ROUND-TRIP-NOTES.md`).
5. **Tests** (`node --test` under `test/`): spine model ops (id generation,
   uniqueness), adapter import/export round-trip against SYNTHETIC fixtures
   committed under `test/fixtures/` (small hand-made files in the exact GotA
   shape — never real game data), validator cases including a planted
   duplicate id. Plus `verify/` checks per the hexwright convention,
   including a local round-trip check that runs against `local/gota/source/`
   when present and skips cleanly when absent.
6. **Known live defect to catch**: the real GotA assets data contains a
   duplicate id (`"152.0"` appears twice). Your validator MUST flag it when
   run against the copied local data. Do not "fix" the source repo.

## Anti-goals / hard constraints

- No counter-graphics generation (Phase 2). No TWU/NaB adapters yet.
- No framework, no bundler, no npm dependencies for the app itself.
- Real game data only ever under `local/` (gitignored). Synthetic fixtures
  only under `test/fixtures/`.
- Do NOT run servers or long-lived processes. You may run `node --test`.
- Do NOT git commit or stage anything. Leave changes for orchestrator review.
