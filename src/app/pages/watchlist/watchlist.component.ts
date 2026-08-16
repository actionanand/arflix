import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { MediaType } from '../../models/tmdb';
import { AuthService } from '../../services/auth.service';
import { BackupFileService } from '../../services/backup-file.service';
import { WatchlistService } from '../../services/watchlist.service';

@Component({
  selector: 'app-watchlist-page',
  imports: [MediaCardComponent, RouterLink],
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.scss',
})
export class WatchlistComponent {
  protected readonly watchlist = inject(WatchlistService);
  private readonly auth = inject(AuthService);
  private readonly backupFiles = inject(BackupFileService);
  protected readonly message = signal('');
  protected readonly visibleItems = computed(() =>
    this.watchlist.items().filter((item) => this.auth.canShowAdult() || !item.adult),
  );

  protected remove(mediaType: MediaType, id: number, title: string): void {
    try {
      this.watchlist.remove(mediaType, id);
      this.message.set(`${title} was removed from your watchlist.`);
    } catch (error) {
      this.message.set(this.errorMessage(error, 'This title could not be removed.'));
    }
  }

  protected exportBackup(): void {
    try {
      const destination = this.backupFiles.export(this.watchlist.createBackup());
      this.message.set(
        destination === 'native'
          ? 'Choose where to save your ARFlix watchlist backup.'
          : 'Your ARFlix watchlist backup was exported.',
      );
    } catch (error) {
      this.message.set(this.errorMessage(error, 'The watchlist backup could not be exported.'));
    }
  }

  protected async importBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      const raw = await this.backupFiles.import(file);
      this.watchlist.restoreBackup(raw);
      this.message.set('Watchlist restored from the selected backup.');
    } catch (error) {
      this.message.set(this.errorMessage(error, 'The watchlist backup could not be imported.'));
    }
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
