import { MediaItem } from './tmdb';

export interface WatchlistItem extends MediaItem {
  addedAt: string;
}

export interface WatchlistBackup {
  app: 'ARFlix';
  exportedAt: string;
  format: 'watchlist';
  items: readonly WatchlistItem[];
  version: 1;
}

export type WatchlistChange = 'added' | 'limit' | 'removed';
