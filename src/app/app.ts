import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthDialogComponent } from './components/auth-dialog/auth-dialog.component';
import { AuthService } from './services/auth.service';
import { NavigationHistoryService } from './services/navigation-history.service';

@Component({
  selector: 'app-root',
  imports: [AuthDialogComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly navigationHistory = inject(NavigationHistoryService);
  protected readonly auth = inject(AuthService);

  protected updateFamilyOnly(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.auth.setFamilyOnly(input?.checked ?? false);
  }
}
