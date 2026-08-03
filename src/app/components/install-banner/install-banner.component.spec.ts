import {
  buildChromeIntentLink,
  buildPlayStoreLink,
  isAndroidChrome,
} from './install-banner.component';

describe('InstallBannerComponent links', () => {
  it('builds the Play Store URL from the configured Android package', () => {
    expect(
      buildPlayStoreLink(
        'https://play.google.com/store/apps/details',
        'com.actionanand.arflix.app',
      ),
    ).toBe('https://play.google.com/store/apps/details?id=com.actionanand.arflix.app');
  });

  it('builds a Chrome Android intent with a Play Store fallback', () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.actionanand.arflix.app';

    expect(buildChromeIntentLink('arflix://home', 'com.actionanand.arflix.app', playStoreUrl)).toBe(
      'intent://home#Intent;scheme=arflix;package=com.actionanand.arflix.app;' +
        `S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`,
    );
  });

  it('detects Android Chrome without treating other Chromium browsers as Chrome', () => {
    const chrome =
      'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36';
    const samsung = `${chrome} SamsungBrowser/28.0`;
    const webView =
      'Mozilla/5.0 (Linux; Android 15; Pixel 8 Build/AP3A; wv) AppleWebKit/537.36 ' +
      'Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36';

    expect(isAndroidChrome(chrome)).toBe(true);
    expect(isAndroidChrome(samsung)).toBe(false);
    expect(isAndroidChrome(webView)).toBe(false);
  });
});
