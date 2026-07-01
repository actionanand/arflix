import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthDialogComponent } from './components/auth-dialog/auth-dialog.component';
import { BackToTopComponent } from './components/back-to-top/back-to-top.component';
import { AuthService } from './services/auth.service';
import { NavigationHistoryService } from './services/navigation-history.service';

interface CapacitorBridge {
  getPlatform?: () => string;
}

@Component({
  selector: 'app-root',
  imports: [AuthDialogComponent, BackToTopComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly navigationHistory = inject(NavigationHistoryService);
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly showLegacyLink = signal(!this.isAndroidApp());

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

  private isAndroidApp(): boolean {
    const capacitor = (globalThis as typeof globalThis & { Capacitor?: CapacitorBridge }).Capacitor;

    return capacitor?.getPlatform?.() === 'android';
  }
}
