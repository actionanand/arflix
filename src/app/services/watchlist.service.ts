import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { MediaItem, MediaType } from '../models/tmdb';
import { WatchlistBackup, WatchlistChange, WatchlistItem } from '../models/watchlist';

const STORAGE_KEY = 'arflix.watchlist.v1';
const STORAGE_VERSION = 1;

interface StoredWatchlist {
  items: readonly WatchlistItem[];
  version: typeof STORAGE_VERSION;
}

@Service()
export class WatchlistService {
  private readonly document = inject(DOCUMENT);
  readonly maxItems = Math.max(1, Math.floor(environment.watchlistMaxItems));
  private readonly itemsState = signal<readonly WatchlistItem[]>(this.load());

  readonly items = this.itemsState.asReadonly();
  readonly count = computed(() => this.itemsState().length);

  isSaved(mediaType: MediaType, id: number): boolean {
    return this.itemsState().some((item) => item.mediaType === mediaType && item.id === id);
  }

  toggle(item: MediaItem): WatchlistChange {
    if (this.isSaved(item.mediaType, item.id)) {
      this.remove(item.mediaType, item.id);
      return 'removed';
    }

    if (this.itemsState().length >= this.maxItems) {
      return 'limit';
    }

    const next: WatchlistItem[] = [
      { ...item, addedAt: new Date().toISOString() },
      ...this.itemsState(),
    ];
    this.persist(next);
    return 'added';
  }

  remove(mediaType: MediaType, id: number): void {
    const next = this.itemsState().filter((item) => item.mediaType !== mediaType || item.id !== id);

    if (next.length !== this.itemsState().length) {
      this.persist(next);
    }
  }

  createBackup(): WatchlistBackup {
    return {
      app: 'ARFlix',
      exportedAt: new Date().toISOString(),
      format: 'watchlist',
      items: this.itemsState(),
      version: 1,
    };
  }

  restoreBackup(value: unknown): number {
    if (!this.isRecord(value)) {
      throw new Error('This file is not an ARFlix watchlist backup.');
    }

    if (value['app'] !== 'ARFlix' || value['format'] !== 'watchlist' || value['version'] !== 1) {
      throw new Error('This backup format is not supported by ARFlix.');
    }

    if (!Array.isArray(value['items'])) {
      throw new Error('The backup does not contain a valid watchlist.');
    }

    const items = this.normalizeItems(value['items']);
    if (items.length > this.maxItems) {
      throw new Error(`A watchlist backup can contain at most ${this.maxItems} titles.`);
    }

    this.persist(items);
    return items.length;
  }

  private load(): readonly WatchlistItem[] {
    const storage = this.document.defaultView?.localStorage;
    if (!storage) return [];

    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const value = JSON.parse(raw) as unknown;
      if (!this.isRecord(value) || value['version'] !== STORAGE_VERSION) return [];
      if (!Array.isArray(value['items'])) return [];

      return this.normalizeItems(value['items']).slice(0, this.maxItems);
    } catch {
      return [];
    }
  }

  private persist(items: readonly WatchlistItem[]): void {
    const storage = this.document.defaultView?.localStorage;
    if (!storage) {
      throw new Error('Watchlist storage is unavailable on this device.');
    }

    const stored: StoredWatchlist = {
      items,
      version: STORAGE_VERSION,
    };

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(stored));
      this.itemsState.set(items);
    } catch {
      throw new Error('ARFlix could not save the watchlist on this device.');
    }
  }

  private normalizeItems(values: readonly unknown[]): WatchlistItem[] {
    const items: WatchlistItem[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      const item = this.normalizeItem(value);
      if (!item) {
        throw new Error('The backup contains an invalid movie or web series entry.');
      }

      const key = `${item.mediaType}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }

    return items;
  }

  private normalizeItem(value: unknown): WatchlistItem | null {
    if (!this.isRecord(value)) return null;

    const id = value['id'];
    const mediaType = value['mediaType'];
    const title = this.stringValue(value['title']);
    const rating = this.numberValue(value['rating']);
    const voteCount = this.numberValue(value['voteCount']);

    if (!Number.isInteger(id) || (id as number) <= 0) return null;
    if (mediaType !== 'movie' && mediaType !== 'tv') return null;
    if (!title || rating === null || voteCount === null) return null;

    return {
      addedAt: this.dateValue(value['addedAt']),
      adult: value['adult'] === true,
      backdropPath: this.nullableStringValue(value['backdropPath']),
      id: id as number,
      mediaType,
      overview: this.stringValue(value['overview']),
      posterPath: this.nullableStringValue(value['posterPath']),
      rating,
      releaseDate: this.stringValue(value['releaseDate']),
      title,
      voteCount: Math.max(0, Math.floor(voteCount)),
    };
  }

  private dateValue(value: unknown): string {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      return new Date().toISOString();
    }
    return value;
  }

  private nullableStringValue(value: unknown): string | null {
    return value === null || value === undefined ? null : this.stringValue(value);
  }

  private numberValue(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim().slice(0, 5000) : '';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
