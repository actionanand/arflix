# Android App Banner & Deep Links

How ARFlix nudges mobile-web visitors into the installed Android app, how the `arflix://` custom
scheme works, and how the banner behaves per browser session.

Relevant files:

- `src/app/components/install-banner/install-banner.component.ts` — the banner UI + logic.
- `src/app/app.ts` / `app.html` — mounts `<app-install-banner />` in the shell.
- `src/environments/environment.ts` / `environment.development.ts` — the single source for the deep
  link base, Android package name, and Play Store base URL.
- `scripts/patch-android-shell.mjs` — generates the Android `AndroidManifest.xml` intent filters.

---

## 1. What the banner is

When someone opens the ARFlix **website** on an Android phone, a small snackbar slides up from the
bottom offering to open the content in the installed native app. It has an **Open** button and a
**✕** dismiss button, and it auto-hides after 15 seconds.

It is intentionally lightweight: no modal, no overlay, and it never blocks the page.

### When it shows

`shouldShow()` returns `true` only when **all** of these are true:

1. **Not already inside the native app.** `isNativeApp()` checks
   `Capacitor.getPlatform() === 'android'`. Inside the Capacitor app this is `'android'`; in a
   normal browser `Capacitor` is undefined, so the check is `false` and the banner is allowed.
2. **On an Android browser.** `navigator.userAgent` matches `/android/i`. (Desktop and iOS never see
   it, since the app ships as an Android build.)
3. **Not dismissed this session** (see §4).

---

## 2. The `arflix://` custom scheme

`arflix://` is a **custom URI scheme** (not `https`). Tapping such a URL asks Android to find an app
that registered to handle that scheme, instead of loading a web page.

### Single source of truth

The scheme base lives once in the environment file:

```ts
// src/environments/environment.ts
androidDeepLinkBaseUrl: 'arflix://',
androidPackageName: 'com.actionanand.arflix.app',
androidPlayStoreBaseUrl: 'https://play.google.com/store/apps/details',
```

The banner derives its target from it, so changing the environment updates every usage:

```ts
function buildAppDeepLink(base: string, path: string): string {
  const trimmed = (base ?? '').trim();
  if (trimmed.endsWith('://') || trimmed.endsWith('/')) return `${trimmed}${path}`;
  return `${trimmed}/${path}`;
}

const APP_DEEP_LINK = buildAppDeepLink(environment.androidDeepLinkBaseUrl, 'home');
// -> 'arflix://home'
```

On Android Chrome, tapping **Open** uses an `intent://` link containing the app package, the
`arflix://home` destination, and the Play Store URL as Chrome's browser fallback. Other Android
browsers continue to use `arflix://home` directly.

### Real content deep links

The same scheme powers shareable content links, produced from the same environment value:

- `arflix://movie/1202033`
- `arflix://person/1202033`
- `arflix://tv-show/1202033`

Their `https` equivalents (e.g. `https://actionanand.github.io/arflix/movie/1202033`) are used for
the web and for verified Android App Links.

---

## 3. How the Android intent system handles it

Android routes a URL to an app using **intent filters** declared in `AndroidManifest.xml`. When a
browser opens `arflix://home`, it fires an `ACTION_VIEW` intent; Android matches it against every
installed app's intent filters and launches the one that declares the `arflix` scheme.

`scripts/patch-android-shell.mjs` writes two filters into the manifest:

```xml
<!-- Custom scheme: matches ANY arflix://... URL (scheme only, no host) -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="arflix" />
</intent-filter>

<!-- Verified App Links: only https + this exact host/path -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="actionanand.github.io" android:pathPrefix="/arflix" />
</intent-filter>
```

Key points:

- `category.BROWSABLE` is required for a browser to be allowed to hand the intent to an app.
- The custom-scheme filter has **only** `android:scheme="arflix"` (no host), so **any**
  `arflix://…` URL — including `arflix://home` — matches and launches the app.
- The `https` filter uses `autoVerify` (App Links). It requires a matching
  `/.well-known/assetlinks.json` on the domain; because that verification is unreliable on GitHub
  Pages, the banner uses the custom `arflix://` scheme instead, which needs no verification.

### "Open" when the app is not installed

The web cannot reliably inspect whether the app is installed. Android Chrome resolves that state
while handling the user-initiated `intent://` navigation:

- **Installed:** Android launches the app.
- **Not installed:** Chrome follows `browser_fallback_url` and opens ARFlix on Google Play.

The fallback is encoded directly into the intent instead of using a JavaScript timer, avoiding an
incorrect Play Store redirect on devices where the installed app takes slightly longer to open.

---

## 4. Per-session display behavior

The banner is meant to be a gentle, once-per-visit nudge, not a repeated nag.

- **Auto-show:** on first eligible page render (`afterNextRender`), the banner appears and starts a
  15-second timer (`AUTO_HIDE_MS`). When the timer fires, the banner hides.
- **Dismiss (✕ or Open):** hides the banner and writes a flag to **`sessionStorage`**
  (`arflix.appBannerDismissed = '1'`). While that flag is set, `shouldShow()` returns `false`, so it
  will not reappear during the current session — even if the user navigates between pages (the SPA
  keeps the same session).
- **New session = shows again.** `sessionStorage` is scoped to the browser tab/session and is
  cleared when the tab is closed (or a fresh tab/window is opened). So the next time the user opens
  the site in a new session, the flag is gone and the banner shows again.
  - By contrast, `localStorage` would persist forever; `sessionStorage` is deliberately chosen so
    the reminder returns on future visits without being annoying within a single visit.
- **Auto-hide alone does not set the flag.** If the banner simply times out after 15 seconds without
  the user acting, it is hidden but **not** marked dismissed for the session. It still will not
  re-trigger on later renders in that session because it only auto-shows once (there is no re-show
  loop), but the "dismissed" flag specifically records an explicit user choice.

### Summary table

| Event                     | Banner hidden | `sessionStorage` flag set | Shows again same session | Shows again new session |
| ------------------------- | ------------- | ------------------------- | ------------------------ | ----------------------- |
| 15s auto-hide (no action) | Yes           | No                        | No (shown only once)     | Yes                     |
| Tap ✕ (dismiss)           | Yes           | Yes                       | No                       | Yes                     |
| Tap Open                  | Yes           | Yes                       | No                       | Yes                     |

---

## 5. Theming

The banner uses the app's global CSS custom properties so it always matches the ARFlix dark/yellow
theme: `--surface-strong` panel, `--accent` (#f7c948) **Open** button with dark text, `--muted`
secondary text and border, and `--accent` focus rings for accessibility.

---

## 6. Regenerating the manifest

The intent filters are generated, so after editing `scripts/patch-android-shell.mjs`:

```bash
npm run android:patch-shell
npx cap sync android
```
