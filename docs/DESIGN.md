# musterwright — design basis

The **force layer** of a digital wargame design stack — sibling of hexwright
(the map layer). Build and edit orders of battle: unit rosters, factor sets,
pooled-strength forces, formation hierarchies, arrival/reinforcement
schedules, and counter metadata — then export the exact JSON each game engine
consumes. Later phases generate counter graphics from the same records.

Register matches hexwright deliberately: **zero-build vanilla JS local web
app**, per-game project files, gitignored `local/` for real game data,
`verify/` check suite, per-project launchers, layer/file-scoped export
buttons. One person (a non-programmer designer) editing real game data with
validation that prevents the defects hand-editing causes.

## Core schema — game-agnostic spine + per-game adapters

- `unit`: stable **editor-generated id** (uniqueness enforced), display
  name/designation, faction/side, echelon size (NATO-style `x`/`xx`), unit
  class (inf/cav/art/HQ/…), an **extensible factor map** (not a fixed set —
  one game speaks sp/ma/drm, another av/dv/mp, another sp+leader),
  counter-art reference(s), notes, provenance.
- `formation`: thin optional army/corps tree.
- `schedule`: a separate arrival/strength table (unit-id × date/turn →
  sp / leader / notInPlay / reinforcement). Games that embed schedules
  per-unit get them re-embedded by their adapter on export.
- `pool`: first-class pooled strength (`sp_count`, per-SP factor derivation).
  Pools and rosters coexist in one project.
- `scenario binding`: setup hex + start state per scenario — lives here, not
  on the eternal unit.

### Known schema tensions (from the real consumer data)

1. **Pooled vs individual** — both must be first-class or pool-based games
   can't round-trip.
2. **Time lives in different places** per game — normalize to the schedule
   table; adapters re-shape on export.
3. **Identity is the defect source** — hand-typed ids have produced real
   duplicate-id defects in shipped data. The editor owns id generation and
   duplicate detection; that is the motivating defect, not a nice-to-have.
4. **Counter-art contract** — per-unit image keys (e.g.
   `counterImages: ["rus-brig-ii-cav-ataman"]`) are the natural contract for
   the Phase-2 graphics generator.

## Phases

**MVP — edit + validate + export (the whole first cut):**
- Create/open a per-game project (schema profile per adapter).
- Roster editing (table-first UI, not form-per-unit), formation tree, pools,
  schedule editing.
- Validation: duplicate ids, missing/extra fields vs the game profile,
  cross-file consistency, orphan counter-art references, schedule rows
  referencing unknown units.
- Per-game export adapters, acceptance-tested as **diff-clean round-trips**
  (import a game's existing files → export → byte-compatible or documented
  semantically-identical).

**Phase 2 — counter-graphics generator:** render counters from unit records
(symbol, factor layout, echelon marks, faction theming from a palette file).
Early symbol target: **NATO symbology rendered from a free/open-licensed
symbology source** (e.g. APP-6/MIL-STD-2525 fonts or the SIL/MIT-licensed
milsymbol renderer), rasterized into counters. License vetting for
redistribution happens before anything ships in a package. Output: per-unit
SVG/PNG plus full countersheet montages at screen AND print resolution.

**Phase 3 — packaged distribution** (out of scope for now).

## Locked decisions

- Name: **musterwright**.
- Symbol direction: NATO-symbology-font first; period glyph sets later.
- Print-resolution countersheet output: yes (Phase 2).
- Derived pool values (e.g. per-SP factors): **derive + show the math, allow
  manual override**.
- First adapter + round-trip consumer: **GotA** (smallest files, a live
  duplicate-id defect to catch, active development).

## Non-goals

Not a map editor (hexwright), not a rules/CRT/chart editor, not a VTT, not a
cloud service, no accounts. Musterwright **exports into** game repos; the
game repos remain the runtime source of truth. Real game data never lands in
this repo — it stays in gitignored `local/`.
