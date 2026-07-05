# verify/

Node-only checks.  Musterwright is a zero-build vanilla JS app; these checks
verify the spine, adapter, and round-trip behavior without booting a browser
or server.

Run the whole suite:

```
npm test
```

Or run individual scripts:

```
node verify/gota-round-trip.mjs
node verify/duplicate-id.mjs
```

Checks that depend on copied local game data (`local/gota/source/`) print
`SKIP local game data not present (...)` and exit 0 when that gitignored path is
absent.
