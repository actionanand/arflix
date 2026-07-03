import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';

interface CapacitorBridge {
  getPlatform?: () => string;
}

const DISMISS_KEY = 'arflix.appBannerDismissed';
const AUTO_HIDE_MS = 15000;
const APP_DEEP_LINK = 'arflix://home';

@Component({
  selector: 'app-install-banner',
  template: `
    @if (visible()) {
      <div class="app-banner" role="region" aria-label="Open in the ARFlix Android app">
        <img class="app-banner__logo" src="ar_flix.png" alt="" width="40" height="40" />
        <div class="app-banner__text">
          <strong>Open in the ARFlix app</strong>
          <span>Get a faster, full-screen experience on Android.</span>
        </div>
        <div class="app-banner__actions">
          <button type="button" class="app-banner__open" (click)="openApp()">Open</button>
          <button
            type="button"
            class="app-banner__close"
            aria-label="Dismiss app suggestion"
            (click)="dismiss()"
          >
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .app-banner {
      position: fixed;
      bottom: calc(1rem + env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      width: min(32rem, calc(100vw - 1.5rem));
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.85rem;
      background: var(--surface-strong, #1a1f2c);
      color: var(--text, #f8fafc);
      border: 1px solid var(--line, rgba(255, 255, 255, 0.12));
      border-radius: var(--radius, 0.5rem);
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
      z-index: 60;
      animation: appBannerIn 0.28s ease;
    }
    .app-banner__logo {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.45rem;
      object-fit: cover;
      flex: 0 0 auto;
    }
    .app-banner__text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 1;
      min-width: 0;
    }
    .app-banner__text strong {
      font-size: 0.95rem;
      font-weight: 800;
    }
    .app-banner__text span {
      font-size: 0.8rem;
      color: var(--muted, #a8b3c7);
    }
    .app-banner__actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex: 0 0 auto;
    }
    .app-banner__open {
      min-height: 44px;
      padding: 0.5rem 1.1rem;
      border: none;
      border-radius: 0.45rem;
      background: var(--accent, #f7c948);
      color: #111;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
    }
    .app-banner__open:hover {
      filter: brightness(1.05);
    }
    .app-banner__close {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 1px solid var(--line, rgba(255, 255, 255, 0.12));
      border-radius: 0.45rem;
      background: transparent;
      color: var(--muted, #a8b3c7);
      cursor: pointer;
    }
    .app-banner__close .material-icons {
      font-size: 1.25rem;
    }
    .app-banner__open:focus-visible,
    .app-banner__close:focus-visible {
      outline: 3px solid var(--accent, #f7c948);
      outline-offset: 2px;
    }
    @keyframes appBannerIn {
      from {
        transform: translateX(-50%) translateY(18px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
  `,
})
export class InstallBannerComponent {
  protected readonly visible = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterNextRender(() => {
      if (!this.shouldShow()) return;
      this.visible.set(true);
      this.timerId = setTimeout(() => this.hide(), AUTO_HIDE_MS);
      this.destroyRef.onDestroy(() => this.clearTimer());
    });
  }

  protected openApp(): void {
    this.dismiss();
    window.location.href = APP_DEEP_LINK;
  }

  protected dismiss(): void {
    this.hide();
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }

  private hide(): void {
    this.visible.set(false);
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private shouldShow(): boolean {
    if (this.isNativeApp()) return false;
    if (!/android/i.test(navigator.userAgent || '')) return false;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return false;
    } catch {
      // Treat storage failures as "not dismissed".
    }
    return true;
  }

  private isNativeApp(): boolean {
    const capacitor = (globalThis as typeof globalThis & { Capacitor?: CapacitorBridge }).Capacitor;
    return capacitor?.getPlatform?.() === 'android';
  }
}
