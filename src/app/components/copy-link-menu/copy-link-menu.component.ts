import { Component, computed, input, signal } from '@angular/core';

import { environment } from '../../../environments/environment';

type LinkTarget = 'android' | 'web';

@Component({
  selector: 'app-copy-link-menu',
  template: `
    <div class="copy-link-menu">
      <button
        type="button"
        class="copy-link-menu__trigger"
        aria-label="Copy page link"
        aria-haspopup="menu"
        [attr.aria-expanded]="menuOpen()"
        (click)="toggleMenu()"
      >
        <span class="material-icons" aria-hidden="true">content_copy</span>
        <span>Copy</span>
      </button>

      @if (menuOpen()) {
        <div class="copy-link-menu__panel" role="menu" aria-label="Copy page link">
          <button type="button" role="menuitem" (click)="copyLink('web')">Web link</button>
          <button type="button" role="menuitem" (click)="copyLink('android')">Android link</button>
        </div>
      }

      @if (message()) {
        <span class="copy-link-menu__status" role="status">{{ message() }}</span>
      }
    </div>
  `,
})
export class CopyLinkMenuComponent {
  readonly routePath = input.required<string>();
  readonly routeId = input.required<number | string>();

  protected readonly menuOpen = signal(false);
  protected readonly message = signal('');
  private readonly pagePath = computed(
    () => `${this.routePath().replace(/^\/+|\/+$/g, '')}/${encodeURIComponent(this.routeId())}`,
  );

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected async copyLink(target: LinkTarget): Promise<void> {
    try {
      await this.writeClipboard(this.buildLink(target));
      this.menuOpen.set(false);
      this.message.set(target === 'android' ? 'Android link copied' : 'Web link copied');
      setTimeout(() => this.message.set(''), 1600);
    } catch {
      this.message.set('Copy failed');
    }
  }

  private buildLink(target: LinkTarget): string {
    const baseUrl =
      target === 'android' ? environment.androidDeepLinkBaseUrl : environment.publicBaseUrl;

    if (baseUrl.endsWith('://')) {
      return `${baseUrl}${this.pagePath()}`;
    }

    return `${baseUrl.replace(/\/$/, '')}/${this.pagePath()}`;
  }

  private async writeClipboard(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
}
