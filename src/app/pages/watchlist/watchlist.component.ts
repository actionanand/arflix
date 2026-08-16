import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { NetworkHelpComponent } from '../../components/network-help/network-help.component';
import { MediaItem, MediaType } from '../../models/tmdb';
import { WatchlistItem } from '../../models/watchlist';
import { AuthService } from '../../services/auth.service';
import { BackupFileService } from '../../services/backup-file.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { SnackbarService } from '../../services/snackbar.service';
import { TmdbService } from '../../services/tmdb.service';
import { WatchlistService } from '../../services/watchlist.service';

const FETCH_BATCH_SIZE = 5;
const LONG_PRESS_DURATION = 520;
const LONG_PRESS_MOVE_TOLERANCE = 12;

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
  private readonly confirmation = inject(ConfirmationDialogService);
  private readonly snackbar = inject(SnackbarService);
  private readonly tmdb = inject(TmdbService);
  protected readonly selectedKeys = signal<ReadonlySet<string>>(new Set());
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
  protected readonly selectionCount = computed(() => this.selectedKeys().size);
  protected readonly selectionMode = computed(() => this.selectionCount() > 0);
  protected readonly selectableKeys = computed(() => {
    const keys = [
      ...this.visibleItems().map((item) => this.itemKey(item.mediaType, item.id)),
      ...this.unavailableEntries().map((item) => this.itemKey(item.mediaType, item.id)),
    ];
    return [...new Set(keys)];
  });
  protected readonly allVisibleSelected = computed(() => {
    const selectable = this.selectableKeys();
    const selected = this.selectedKeys();
    return selectable.length > 0 && selectable.every((key) => selected.has(key));
  });
  private longPressTimer: ReturnType<typeof setTimeout> | undefined;
  private longPressOrigin: { x: number; y: number } | null = null;

  protected async requestRemove(mediaType: MediaType, id: number, title: string): Promise<void> {
    const confirmed = await this.confirmation.ask({
      confirmLabel: 'Delete',
      message: `${title} will be removed from the watchlist saved on this device.`,
      title: 'Remove from watchlist?',
    });
    if (!confirmed) return;

    try {
      this.watchlist.remove(mediaType, id);
      this.snackbar.show(`${title} was deleted from your watchlist.`);
    } catch (error) {
      this.snackbar.show(this.errorMessage(error, 'This title could not be removed.'), 'error');
    }
  }

  protected async deleteSelected(): Promise<void> {
    const selected = this.selectedKeys();
    const entries = this.watchlist
      .items()
      .filter((entry) => selected.has(this.itemKey(entry.mediaType, entry.id)));
    if (!entries.length) return;

    const labels = entries.map((entry) => this.titleFor(entry));
    const confirmed = await this.confirmation.ask({
      confirmLabel: `Delete ${entries.length}`,
      message:
        entries.length === 1
          ? `${labels[0]} will be removed from the watchlist saved on this device.`
          : `${entries.length} selected titles will be removed from the watchlist saved on this device.`,
      title: entries.length === 1 ? 'Remove from watchlist?' : 'Delete selected titles?',
    });
    if (!confirmed) return;

    try {
      const removedCount = this.watchlist.removeMany(entries);
      this.clearSelection();
      this.snackbar.show(this.deletedMessage(labels, removedCount));
    } catch (error) {
      this.snackbar.show(
        this.errorMessage(error, 'The selected titles could not be removed.'),
        'error',
      );
    }
  }

  protected toggleSelection(item: Pick<WatchlistItem, 'id' | 'mediaType'>): void {
    const key = this.itemKey(item.mediaType, item.id);
    this.selectedKeys.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected isSelected(mediaType: MediaType, id: number): boolean {
    return this.selectedKeys().has(this.itemKey(mediaType, id));
  }

  protected selectAllVisible(): void {
    this.selectedKeys.set(new Set(this.selectableKeys()));
  }

  protected clearSelection(): void {
    this.selectedKeys.set(new Set());
  }

  protected startLongPress(
    event: PointerEvent,
    item: Pick<WatchlistItem, 'id' | 'mediaType'>,
  ): void {
    if (event.pointerType === 'mouse' || this.selectionMode()) return;

    this.cancelLongPress();
    this.longPressOrigin = { x: event.clientX, y: event.clientY };
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = undefined;
      this.longPressOrigin = null;
      this.toggleSelection(item);
    }, LONG_PRESS_DURATION);
  }

  protected trackLongPress(event: PointerEvent): void {
    const origin = this.longPressOrigin;
    if (!origin) return;

    if (
      Math.abs(event.clientX - origin.x) > LONG_PRESS_MOVE_TOLERANCE ||
      Math.abs(event.clientY - origin.y) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      this.cancelLongPress();
    }
  }

  protected cancelLongPress(): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = undefined;
    this.longPressOrigin = null;
  }

  protected exportBackup(): void {
    try {
      const destination = this.backupFiles.export(this.watchlist.createBackup());
      this.snackbar.show(
        destination === 'native'
          ? 'Choose where to save your ARFlix watchlist backup.'
          : 'Your ARFlix watchlist backup was exported.',
      );
    } catch (error) {
      this.snackbar.show(
        this.errorMessage(error, 'The watchlist backup could not be exported.'),
        'error',
      );
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
      this.clearSelection();
      this.snackbar.show('Watchlist restored from the selected backup.');
    } catch (error) {
      this.snackbar.show(
        this.errorMessage(error, 'The watchlist backup could not be imported.'),
        'error',
      );
    }
  }

  protected entryLabel(entry: WatchlistItem): string {
    return `${entry.mediaType === 'movie' ? 'Movie' : 'Web series'} #${entry.id}`;
  }

  private titleFor(entry: WatchlistItem): string {
    return (
      this.titlesResource
        .value()
        .items.find((item) => item.id === entry.id && item.mediaType === entry.mediaType)?.title ??
      this.entryLabel(entry)
    );
  }

  private deletedMessage(labels: readonly string[], removedCount: number): string {
    if (removedCount === 1) return `${labels[0]} was deleted from your watchlist.`;
    if (removedCount === 2)
      return `${labels[0]} and ${labels[1]} were deleted from your watchlist.`;
    return `${labels[0]}, ${labels[1]} and ${removedCount - 2} more were deleted from your watchlist.`;
  }

  private itemKey(mediaType: MediaType, id: number): string {
    return `${mediaType}:${id}`;
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
