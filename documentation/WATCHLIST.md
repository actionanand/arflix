# ARFlix Watchlist

ARFlix stores a private watchlist in the browser or Android WebView local storage. Movies and web
series share one limit, configured with `watchlistMaxItems` in both environment files.

## User flow

- A title can be added or removed from its movie or TV detail page.
- `/watchlist` displays saved titles and supports individual removal.
- Logged-out and Family mode views follow the existing adult-content visibility rules.
- Export creates an `arflix-watchlist-YYYY-MM-DD.json` backup.
- Import validates the complete file and then replaces the local watchlist atomically.

## Backup format

The JSON backup is versioned and identifies itself with `app: "ARFlix"` and
`format: "watchlist"`. Each entry contains only the TMDb ID, media type, and the time it was saved.
Poster paths, backdrop paths, and other title metadata are not stored or exported. The watchlist
route fetches current display information from TMDb by ID. Duplicate movie/type pairs are removed
during import. Unsupported, malformed, oversized, or over-limit backups are rejected without
changing the current list.

When ARFlix starts, older watchlist records are migrated in place to the identifier-only shape, so
previously stored poster and backdrop paths are removed from local storage.

## Android export

Web exports use a temporary Blob download. In the Android application,
`scripts/patch-android-shell.mjs` exposes `ARFlixAndroid.exportBackupJson()` and launches Android's
`ACTION_CREATE_DOCUMENT` picker. The JSON is written only after the user chooses a destination.
Import uses the standard file input, which Capacitor's WebView opens through Android's document
picker.
