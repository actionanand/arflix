import { Service } from '@angular/core';

import { environment } from '../../environments/environment';
import {
  DetailsPageData,
  HomeSections,
  MediaItem,
  MediaType,
  SearchPageResult,
  SearchRequest,
  TmdbCredits,
  TmdbDetails,
  TmdbMediaResult,
  TmdbMovieDetails,
  TmdbPagedResponse,
  TmdbVideo,
} from '../models/tmdb';

type QueryValue = string | number | boolean | undefined;

@Service()
export class TmdbService {
  private readonly baseUrl = environment.tmdbBaseUrl;
  private readonly imageBaseUrl = environment.tmdbImageBaseUrl;
  private readonly apiReadToken = environment.tmdbApiReadToken;

  async getHomeSections(abortSignal?: AbortSignal): Promise<HomeSections> {
    const [trending, movies, tvShows] = await Promise.all([
      this.getList('/trending/all/day', { page: 1 }, abortSignal),
      this.getList('/movie/now_playing', { page: 1 }, abortSignal),
      this.getList('/tv/on_the_air', { page: 1 }, abortSignal),
    ]);

    return {
      trending: trending.slice(0, 8),
      movies: movies.slice(0, 10),
      tvShows: tvShows.slice(0, 10),
    };
  }

  async search(request: SearchRequest, abortSignal?: AbortSignal): Promise<SearchPageResult> {
    const endpoint = request.type === 'all' ? '/search/multi' : `/search/${request.type}`;
    const response = await this.request<TmdbPagedResponse<TmdbMediaResult>>(
      endpoint,
      {
        query: request.query,
        page: request.page,
        include_adult: false,
      },
      abortSignal,
    );

    return {
      items: response.results
        .map((result) => this.toMediaItem(result, request.type))
        .filter((item) => item !== null),
      totalPages: Math.min(response.total_pages, 500),
      totalResults: response.total_results,
    };
  }

  async getDetails(
    type: MediaType,
    id: number,
    abortSignal?: AbortSignal,
  ): Promise<DetailsPageData> {
    const [details, videos, credits, similar] = await Promise.all([
      this.request<TmdbDetails>(`/${type}/${id}`, undefined, abortSignal),
      this.request<{ results: TmdbVideo[] }>(`/${type}/${id}/videos`, undefined, abortSignal),
      this.request<TmdbCredits>(`/${type}/${id}/credits`, undefined, abortSignal),
      this.getList(`/${type}/${id}/similar`, { page: 1 }, abortSignal),
    ]);

    return {
      details,
      cast: credits.cast.slice(0, 8),
      similar: similar.slice(0, 10),
      trailerUrl: this.findTrailerUrl(videos.results),
    };
  }

  imageUrl(path: string | null | undefined, size = 'w500'): string | null {
    if (!path) {
      return null;
    }

    return `${this.imageBaseUrl}/${size}${path}`;
  }

  backdropUrl(path: string | null | undefined): string | null {
    return this.imageUrl(path, 'w780');
  }

  runtimeLabel(details: TmdbDetails): string {
    if (this.isMovieDetails(details)) {
      if (!details.runtime) {
        return 'Runtime unavailable';
      }

      const hours = Math.floor(details.runtime / 60);
      const minutes = details.runtime % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    const runtime = details.episode_run_time[0];
    return runtime ? `${runtime}m episodes` : 'Episode length unavailable';
  }

  mediaTitle(details: TmdbDetails): string {
    return this.isMovieDetails(details) ? details.title : details.name;
  }

  mediaDate(details: TmdbDetails): string {
    return this.isMovieDetails(details) ? details.release_date : details.first_air_date;
  }

  private async getList(
    endpoint: string,
    query: Record<string, QueryValue> = {},
    abortSignal?: AbortSignal,
  ): Promise<MediaItem[]> {
    const response = await this.request<TmdbPagedResponse<TmdbMediaResult>>(
      endpoint,
      query,
      abortSignal,
    );
    return response.results
      .map((result) => this.toMediaItem(result, this.mediaTypeFromEndpoint(endpoint)))
      .filter((item) => item !== null);
  }

  private async request<T>(
    endpoint: string,
    query: Record<string, QueryValue> = {},
    abortSignal?: AbortSignal,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiReadToken}`,
        Accept: 'application/json',
      },
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`TMDb request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private toMediaItem(result: TmdbMediaResult, fallbackType: MediaType | 'all'): MediaItem | null {
    const mediaType = this.resolveMediaType(result, fallbackType);

    if (!mediaType) {
      return null;
    }

    return {
      id: result.id,
      mediaType,
      title: result.title ?? result.name ?? 'Untitled',
      overview: result.overview ?? '',
      posterPath: result.poster_path ?? null,
      backdropPath: result.backdrop_path ?? null,
      releaseDate: result.release_date ?? result.first_air_date ?? '',
      rating: result.vote_average ?? 0,
      voteCount: result.vote_count ?? 0,
    };
  }

  private resolveMediaType(
    result: TmdbMediaResult,
    fallbackType: MediaType | 'all',
  ): MediaType | null {
    if (result.media_type === 'movie' || result.media_type === 'tv') {
      return result.media_type;
    }

    if (fallbackType === 'movie' || fallbackType === 'tv') {
      return fallbackType;
    }

    return null;
  }

  private mediaTypeFromEndpoint(endpoint: string): MediaType | 'all' {
    if (endpoint.startsWith('/movie')) {
      return 'movie';
    }

    if (endpoint.startsWith('/tv')) {
      return 'tv';
    }

    return 'all';
  }

  private findTrailerUrl(videos: TmdbVideo[]): string | null {
    const trailer =
      videos.find(
        (video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official,
      ) ??
      videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer') ??
      videos.find((video) => video.site === 'YouTube');

    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  }

  private isMovieDetails(details: TmdbDetails): details is TmdbMovieDetails {
    return 'title' in details;
  }
}
