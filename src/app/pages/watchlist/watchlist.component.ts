import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { NetworkHelpComponent } from '../../components/network-help/network-help.component';
import { MediaItem, MediaType } from '../../models/tmdb';
import { WatchlistItem } from '../../models/watchlist';
import { AuthService } from '../../services/auth.service';
import { BackupFileService } from '../../services/backup-file.service';
import { TmdbService } from '../../services/tmdb.service';
import { WatchlistService } from '../../services/watchlist.service';

const FETCH_BATCH_SIZE = 5;

interface WatchlistRequest {
  entries: readonly WatchlistItem[];
  key: string;
}

interface WatchlistPageData {
  items: readonly MediaItem[];
  unavailable: readonly WatchlistItem[];
}

const emptyPageData: WatchlistPageData = {
  items: [],
  unavailable: [],
};

@Component({
  selector: 'app-watchlist-page',
  imports: [MediaCardComponent, NetworkHelpComponent, RouterLink],
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.scss',
})
export class WatchlistComponent {
  protected readonly watchlist = inject(WatchlistService);
  private readonly auth = inject(AuthService);
  private readonly backupFiles = inject(BackupFileService);
  private readonly tmdb = inject(TmdbService);
  protected readonly message = signal('');
  protected readonly titlesResource = resource<WatchlistPageData, WatchlistRequest | undefined>({
    defaultValue: emptyPageData,
    params: () => {
      const entries = this.watchlist.items();
      return entries.length
        ? {
            entries,
            key: entries.map((entry) => `${entry.mediaType}:${entry.id}`).join('|'),
          }
        : undefined;
    },
    loader: ({ params, abortSignal }) => this.loadTitles(params.entries, abortSignal),
  });
  protected readonly visibleItems = computed(() =>
    this.titlesResource.value().items.filter((item) => this.auth.canShowAdult() || !item.adult),
  );
  protected readonly unavailableEntries = computed(() =>
    this.titlesResource.error() ? this.watchlist.items() : this.titlesResource.value().unavailable,
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

  protected entryLabel(entry: WatchlistItem): string {
    return `${entry.mediaType === 'movie' ? 'Movie' : 'Web series'} #${entry.id}`;
  }

  private async loadTitles(
    entries: readonly WatchlistItem[],
    abortSignal: AbortSignal,
  ): Promise<WatchlistPageData> {
    const items: MediaItem[] = [];
    const unavailable: WatchlistItem[] = [];

    for (let index = 0; index < entries.length; index += FETCH_BATCH_SIZE) {
      const batch = entries.slice(index, index + FETCH_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((entry) => this.tmdb.getTitleInfoById(entry.mediaType, entry.id, abortSignal)),
      );

      const failures = results
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason as unknown);
      if (
        results.every((result) => result.status === 'rejected') &&
        failures.every((error) => this.tmdb.isNetworkError(error))
      ) {
        throw failures[0];
      }

      results.forEach((result, resultIndex) => {
        if (result.status === 'fulfilled' && result.value) {
          items.push(result.value);
        } else {
          unavailable.push(batch[resultIndex]);
        }
      });
    }

    return { items, unavailable };
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
