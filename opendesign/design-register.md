# musterwright — design register

Drafted 2026-07-06 (Claude, leans marked; Ray certifies at sign-off).
musterwright is the force layer of Ray's wargame-design tool stack, the
sibling of hexwright (the map layer). The register is therefore inherited,
not invented: musterwright wears the hexwright workbench look so the stack
reads as one toolbench.

## Identity

A designer's instrument, not a consumer app. The user is Ray (and later,
other wargame designers) building orders of battle: rosters, factor sets,
counter definitions. The room it lives in is the same room as hexwright:
a dark drafting desk with luminous data on it.

## Locked art direction [LOCK: match hexwright workbench]

- Dark desk ground, hairline chrome, data glows brighter than furniture.
- Data is monospace; UI labels are the system sans. Numbers align in
  columns like a typed OOB sheet.
- One accent, used sparingly for focus/action: the hexwright cyan.
- Danger/validation red reserved for findings that block export.

## Tokens (adopt the hx- family; fallbacks are the values)

| Token | Value | Role |
|---|---|---|
| --hx-bg-canvas | #15171a | desk / page ground |
| --hx-bg-panel  | #1d2024 | panels, cards (one step up from desk) |
| --hx-hairline  | #2a2e33 | borders, dividers, chrome |
| --hx-text      | #d5d9de | primary text |
| --hx-text-dim  | #8d949c | muted / secondary |
| --hx-accent    | #7ad9ff | focus, action, selection |
| --hx-danger    | #dc2828 | blocking findings, destructive |
| --font-ui      | system-ui stack | labels, buttons, prose |
| --font-data    | ui-monospace stack | tables, factors, ids, codes |

No webfonts. System stacks only (satisfies the no-remote-fonts gate by
construction; nothing to vendor).

## Counter art direction [LOCK: APP-6 via milsymbol, monochrome-on-counter]

Counters render as classic board-wargame counters: a solid faction-color
square, a NATO APP-6/MIL-STD-2525 unit-type icon in the frame area, factor
numbers along the bottom edge in --font-data. Symbol generation uses
milsymbol (MIT, v3.0.4, vendored locally — no CDN). Icons render
monochrome (black or white chosen per faction-color luminance), not the
APP-6 affiliation palette: on a counter, the faction color IS the
affiliation. Frame shape stays neutral (rectangle), not the
friendly/hostile frame geometry, for the same reason.

## Component inventory (current surfaces)

- Top chrome: app title, dataset picker, import/export actions.
- Tabs: roster table, factor sets, findings, counter preview (new).
- Roster table: the core surface. Dense rows, mono data columns,
  inline edit, dup/error rows flagged with the danger accent.
- Findings panel: errors-first list (already sorted errors-first).
- Counter preview (new this pass): grid of rendered counters from the
  live roster, one per unit, using the counter art direction above.

## Out of scope for this pass

- No cartography, no map rendering (hexwright's job).
- No print/export sheet styling yet (Phase 2 counter generator handles
  physical output; this pass is the on-screen preview).
- No light theme.
