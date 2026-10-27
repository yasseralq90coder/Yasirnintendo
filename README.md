# Yasir Nintendo 4.0 — Nintendo Club

Android + offline PWA. Personal activity stays on the device; GitHub stores application code and public Nintendo/retailer snapshots only.

## New in 4.0
- Owned/demo/NSO/free/borrowed/unclassified shelves, bulk classification, tags, archive, list/grid and official recent-play sorting. User-confirmed ownership never adds playtime.
- 80 personal achievement tiers grouped into 20 paths, a four-medal showcase, chosen next goal and level roadmap. Existing XP totals/formula preserved; no inactivity penalties.
- Public Nintendo US digital and Saudi noon price snapshots, per-price timestamps, expiry/stale handling, genre/budget sorting and price watches. Amazon fetching is best effort with explicit unavailable status and direct Saudi search fallback. No cheapest-market or Mecca delivery guarantee.
- Exact-title/edition official metadata and trailers where present. Curated guide/community links for selected titles, explicit searches for others.
- Android isolated guide reader: last URL and scroll remembered locally, no native account bridge. Guide chapters, notes and checklist are included in JSON backup; device reader scroll is device-local.
- Opt-in Android hourly price-target notifications (JobScheduler; timing depends on Android battery/network). Currency and freshness checked; no account data leaves the device.

## Data rules
Nintendo activity is the only source of play minutes. NSO container minutes never get allocated to child games. Playing device since 2025-08-01 is Switch 2; original game/platform IDs remain unchanged. Dated repeated completions are player-declared flags, without a 100% completion category. Classifying ownership cannot create a flag.

## Prices and freshness
`tools/refresh-store.py` fetches public pages without authentication. `public-world.yml` runs hourly and updates Pages; failure keeps old source entries with their original timestamps. Offers older than 24 hours are labeled stale; expired offers are hidden and never trigger notifications. USD-to-SAR at 3.75 is a comparison estimate, before fees. Retail prices exclude unknown delivery fees; enter your Mecca address at the retailer to verify seller, stock and final delivery. No purchase is performed by this app.

## Build
`npm ci --ignore-scripts`, `npm test`, `npm run check`, `python3 -m unittest discover -s tests -p '*_test.py'`, then `node tools/package-android.mjs`.
GitHub Actions builds Android with Java 17 / Gradle 8.11.1, runs unit tests/lint and an API 29 smoke test, then publishes `YasirNintendo.apk` under `android-preview`. Signing cache preserves update compatibility. GitHub Pages receives only the explicit public file allowlist.

## Privacy / backup
The bundled `library-seed.json` is empty. Import private historical libraries locally from Settings. JSON backups include classification, guide checklist, favorites, flags and price watches, but never Nintendo authentication tokens. Android tokens remain encrypted in Keystore-backed storage. Account reconnection is required after transferring to another device. Guide pages run in a separate WebView without AndroidBridge and cannot read the local app origin.

Legacy detailed account-linking documentation: [Android](android/README.md), [optional web bridge](server/README.md).
