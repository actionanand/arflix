import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { MediaItem } from '../models/tmdb';
import { WatchlistService } from './watchlist.service';

describe('WatchlistService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores movies and web series together up to the configured limit', () => {
    const service = TestBed.inject(WatchlistService);

    for (let index = 1; index <= environment.watchlistMaxItems; index += 1) {
      expect(service.toggle(mediaItem(index, index % 2 === 0 ? 'tv' : 'movie'))).toBe('added');
    }

    expect(service.count()).toBe(environment.watchlistMaxItems);
    expect(service.toggle(mediaItem(environment.watchlistMaxItems + 1, 'movie'))).toBe('limit');
  });

  it('restores a valid exported backup', () => {
    const service = TestBed.inject(WatchlistService);
    service.toggle(mediaItem(10, 'movie'));
    service.toggle(mediaItem(20, 'tv'));
    const backup = service.createBackup();

    service.remove('movie', 10);
    service.remove('tv', 20);

    expect(service.restoreBackup(backup)).toBe(2);
    expect(service.isSaved('movie', 10)).toBe(true);
    expect(service.isSaved('tv', 20)).toBe(true);
  });

  it('stores and exports identifiers without image paths', () => {
    const service = TestBed.inject(WatchlistService);
    service.toggle(mediaItem(10, 'movie'));

    const stored = localStorage.getItem('arflix.watchlist.v1') ?? '';
    const backup = JSON.stringify(service.createBackup());

    expect(stored).not.toContain('posterPath');
    expect(stored).not.toContain('backdropPath');
    expect(backup).not.toContain('posterPath');
    expect(backup).not.toContain('backdropPath');
  });

  it('removes image paths while loading an older stored watchlist', () => {
    localStorage.setItem(
      'arflix.watchlist.v1',
      JSON.stringify({
        version: 1,
        items: [{ ...mediaItem(10, 'movie'), addedAt: '2026-08-16T00:00:00.000Z' }],
      }),
    );

    const service = TestBed.inject(WatchlistService);
    const migrated = localStorage.getItem('arflix.watchlist.v1') ?? '';

    expect(service.isSaved('movie', 10)).toBe(true);
    expect(migrated).not.toContain('posterPath');
    expect(migrated).not.toContain('backdropPath');
  });

  it('does not replace the current list with an invalid backup', () => {
    const service = TestBed.inject(WatchlistService);
    service.toggle(mediaItem(10, 'movie'));

    expect(() => service.restoreBackup({ app: 'Another app', items: [] })).toThrowError();
    expect(service.isSaved('movie', 10)).toBe(true);
  });
});

function mediaItem(id: number, mediaType: MediaItem['mediaType']): MediaItem {
  return {
    adult: false,
    backdropPath: `/backdrop-${id}.jpg`,
    id,
    mediaType,
    overview: `Overview ${id}`,
    posterPath: `/poster-${id}.jpg`,
    rating: 7.5,
    releaseDate: '2026-08-16',
    title: `Title ${id}`,
    voteCount: 100,
  };
}
