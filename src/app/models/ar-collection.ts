import { MediaItem } from './tmdb';

export interface ArCollectionRow {
  serialNumber: string;
  title: string;
  type: string;
  platform: string;
  language: string;
  category: string;
  isAdult: string;
  comment: string;
  tmdbId: number | null;
}

export interface ArCollectionItem {
  sheet: ArCollectionRow;
  media: MediaItem | null;
}
