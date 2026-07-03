import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthDialogComponent } from './components/auth-dialog/auth-dialog.component';
import { BackToTopComponent } from './components/back-to-top/back-to-top.component';
import { InstallBannerComponent } from './components/install-banner/install-banner.component';
import { AuthService } from './services/auth.service';
import { NavigationHistoryService } from './services/navigation-history.service';
import { environment } from '../environments/environment';

interface CapacitorBridge {
  getPlatform?: () => string;
}

interface ArflixNativeBridge {
  consumeDeepLink?: () => string;
}

// Deep-link config derived from the single source of truth in the environment file.
const CUSTOM_LINK_SCHEME = `${environment.androidDeepLinkBaseUrl.split('://')[0]}:`;
const WEB_LINK_URL = new URL(environment.publicBaseUrl);
const WEB_LINK_HOST = WEB_LINK_URL.hostname;
const WEB_LINK_BASE_SEGMENT = WEB_LINK_URL.pathname.split('/').filter(Boolean)[0] ?? '';
const DEEP_LINK_TYPES = new Set(['movie', 'person', 'tv-show']);

@Component({
  selector: 'app-root',
  imports: [
    AuthDialogComponent,
    BackToTopComponent,
    InstallBannerComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly navigationHistory = inject(NavigationHistoryService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly menuOpen = signal(false);
  protected readonly showLegacyLink = signal(!this.isAndroidApp());

  constructor() {
    afterNextRender(() => {
      this.consumePendingDeepLink();

      const handleFocus = (): void => this.consumePendingDeepLink();
      const handleVisibility = (): void => {
        if (document.visibilityState === 'visible') this.consumePendingDeepLink();
      };

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
      });
    });
  }

  protected updateFamilyOnly(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.auth.setFamilyOnly(input?.checked ?? false);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private consumePendingDeepLink(): void {
    const bridge = (globalThis as typeof globalThis & { ARFlixAndroid?: ArflixNativeBridge })
      .ARFlixAndroid;
    const rawUrl = bridge?.consumeDeepLink?.();
    if (!rawUrl) return;

    const route = this.routeFromDeepLink(rawUrl);
    if (route) void this.router.navigateByUrl(route);
  }

  private routeFromDeepLink(rawUrl: string): string | null {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }

    let segments: string[];
    if (url.protocol === CUSTOM_LINK_SCHEME) {
      // arflix://movie/1202033 -> ['movie', '1202033']
      segments = [url.hostname, ...url.pathname.split('/')].filter(Boolean);
    } else if (url.hostname === WEB_LINK_HOST) {
      // https://actionanand.github.io/arflix/movie/1202033 -> ['movie', '1202033']
      segments = url.pathname.split('/').filter(Boolean);
      if (WEB_LINK_BASE_SEGMENT && segments[0] === WEB_LINK_BASE_SEGMENT) {
        segments = segments.slice(1);
      }
    } else {
      return null;
    }

    const [type, id] = segments;
    if (!type || !id || !DEEP_LINK_TYPES.has(type)) return null;
    return `/${type}/${encodeURIComponent(id)}`;
  }

  private isAndroidApp(): boolean {
    const capacitor = (globalThis as typeof globalThis & { Capacitor?: CapacitorBridge }).Capacitor;

    return capacitor?.getPlatform?.() === 'android';
  }
}
