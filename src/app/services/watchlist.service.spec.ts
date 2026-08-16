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
