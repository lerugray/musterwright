# GotA round-trip notes

Musterwright imports the three GotA consumer files (`oob.json`,
`assets.json`, `sp_pools.json`) into the game-agnostic spine and exports them
back out.  The export is **semantically identical** to the source; any
formatting differences are cosmetic and are ignored by the normalizer used in
acceptance tests.

## Intentional normalizations

1. **Faction key order** — source files group units by faction object key.
   Export preserves the faction order seen during import (`factionOrder`).
   Notes stored as `_note_<faction>` are emitted next to their faction block.
2. **Unit order** — preserved from import unless the user re-sorts the table.
   The acceptance normalizer sorts by `id` before comparing, so order does not
   affect semantic equality.
3. **Number formatting** — JSON input may write `7.0`; `JSON.stringify` emits
   `7`.  Both represent the same value.  The normalizer rounds floats to six
   decimal places before comparison.
4. **Extra fields** — unknown keys such as `post_v1`, `playable`, or
   `_note_socialist` are preserved on import and re-emitted on export so the
   consumer files remain intact.  The validator flags unknown unit fields as
   warnings but does not strip them.
5. **Missing optional fields** — `fresh` is only emitted when it is explicitly
   `true` or `false` in the source.  Optional `notes` on pools are only
   emitted when non-empty.

## Acceptance test

`verify/gota-round-trip.mjs` reads the copied files in `local/gota/source/`,
imports, exports, and asserts `roundTripEqual(source, exported)`.  It runs
only when the gitignored local data is present; on a fresh clone it prints
`SKIP` and exits 0.  The test also asserts that the validator flags the known
live duplicate id `"152.0"` in `assets.json`.
