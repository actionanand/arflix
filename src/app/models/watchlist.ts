import { MediaType } from './tmdb';

export interface WatchlistItem {
  addedAt: string;
  id: number;
  mediaType: MediaType;
}

export interface WatchlistBackup {
  app: 'ARFlix';
  exportedAt: string;
  format: 'watchlist';
  items: readonly WatchlistItem[];
  version: 1;
}

export type WatchlistChange = 'added' | 'limit' | 'removed';
