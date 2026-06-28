import { Service } from '@angular/core';

import { environment } from '../../environments/environment';
import {
  BrowseCategories,
  BrowsePageResult,
  BrowseRequest,
  DetailsPageData,
  HomeSections,
  MediaItem,
  MediaType,
  SearchPageResult,
  SearchRequest,
  TmdbCredits,
  TmdbDetails,
  TmdbGenre,
  TmdbImageSet,
  TmdbMediaResult,
  TmdbMovieDetails,
  TmdbMovieReleaseDates,
  TmdbPagedResponse,
  TmdbProvider,
  TmdbProviderResponse,
  TmdbTvContentRatings,
  TmdbVideo,
} from '../models/tmdb';

type QueryValue = string | number | boolean | undefined;

@Service()
export class TmdbService {
  private readonly baseUrl = environment.tmdbBaseUrl;
  private readonly imageBaseUrl = environment.tmdbImageBaseUrl;
  private readonly apiReadToken = environment.tmdbApiReadToken;
  readonly movieFallbackImage = 'assets/images/movie-not-found.png';
  readonly posterFallbackImage = 'assets/images/img-not-found.svg';
  readonly castFallbackImage = 'assets/images/man-placeholder.jpg';

  async getHomeSections(abortSignal?: AbortSignal): Promise<HomeSections> {
    const [trending, movies, inTheatres, tvShows, movieGenres, tvGenres] = await Promise.all([
      this.getList('/trending/all/day', { page: 1 }, abortSignal),
      this.getList('/movie/popular', { page: 1 }, abortSignal),
      this.getList('/movie/now_playing', { page: 1 }, abortSignal),
      this.getList('/tv/on_the_air', { page: 1 }, abortSignal),
      this.getGenres('movie', abortSignal),
      this.getGenres('tv', abortSignal),
    ]);

    return {
      inTheatres: inTheatres.slice(0, 10),
      trending: trending.slice(0, 8),
      movies: movies.slice(0, 10),
      tvShows: tvShows.slice(0, 10),
      movieGenres,
      tvGenres,
    };
  }

  async getBrowseCategories(abortSignal?: AbortSignal): Promise<BrowseCategories> {
    const [movieGenres, tvGenres] = await Promise.all([
      this.getGenres('movie', abortSignal),
      this.getGenres('tv', abortSignal),
    ]);

    return {
      movieGenres,
      tvGenres,
    };
  }

  async browseByCategory(
    request: BrowseRequest,
    abortSignal?: AbortSignal,
  ): Promise<BrowsePageResult> {
    if (!request.genreId) {
      const endpoint = request.type === 'movie' ? '/movie/popular' : '/tv/popular';
      const response = await this.request<TmdbPagedResponse<TmdbMediaResult>>(
        endpoint,
        {
          include_adult: false,
          page: request.page,
        },
        abortSignal,
      );

      return {
        genreName: request.type === 'movie' ? 'Popular Movies' : 'Popular TV & Web Series',
        items: response.results
          .filter((result) => result.adult !== true)
          .map((result) => this.toMediaItem(result, request.type))
          .filter((item) => item !== null),
        totalPages: Math.min(response.total_pages, 500),
        totalResults: response.total_results,
      };
    }

    const [genres, response] = await Promise.all([
      this.getGenres(request.type, abortSignal),
      this.request<TmdbPagedResponse<TmdbMediaResult>>(
        `/discover/${request.type}`,
        {
          include_adult: false,
          page: request.page,
          sort_by: request.type === 'movie' ? 'popularity.desc' : 'vote_average.desc',
          'vote_count.gte': request.type === 'movie' ? 150 : 50,
          with_genres: request.genreId,
        },
        abortSignal,
      ),
    ]);

    return {
      genreName: genres.find((genre) => genre.id === request.genreId)?.name ?? 'Category',
      items: response.results
        .map((result) => this.toMediaItem(result, request.type))
        .filter((item) => item !== null),
      totalPages: Math.min(response.total_pages, 500),
      totalResults: response.total_results,
    };
  }

  async search(request: SearchRequest, abortSignal?: AbortSignal): Promise<SearchPageResult> {
    const endpoint = request.type === 'all' ? '/search/multi' : `/search/${request.type}`;
    const yearParam =
      request.year && request.type === 'movie'
        ? { primary_release_year: request.year }
        : request.year && request.type === 'tv'
          ? { first_air_date_year: request.year }
          : {};
    const response = await this.request<TmdbPagedResponse<TmdbMediaResult>>(
      endpoint,
      {
        query: request.query,
        page: request.page,
        include_adult: false,
        ...yearParam,
      },
      abortSignal,
    );
    const items = response.results
      .map((result) => this.toMediaItem(result, request.type))
      .filter((item) => item !== null)
      .filter((item) => !request.year || item.releaseDate.startsWith(request.year))
      .filter((item) => item.rating >= request.minRating)
      .sort((first, second) => {
        if (request.sort === 'rating') {
          return second.rating - first.rating;
        }

        if (request.sort === 'newest') {
          return second.releaseDate.localeCompare(first.releaseDate);
        }

        return 0;
      });

    return {
      items,
      totalPages: Math.min(response.total_pages, 500),
      totalResults: request.year || request.minRating ? items.length : response.total_results,
    };
  }

  async getDetails(
    type: MediaType,
    id: number,
    abortSignal?: AbortSignal,
  ): Promise<DetailsPageData> {
    const [details, videos, credits, similar, images, providers, certification] = await Promise.all(
      [
        this.request<TmdbDetails>(`/${type}/${id}`, undefined, abortSignal),
        this.request<{ results: TmdbVideo[] }>(`/${type}/${id}/videos`, undefined, abortSignal),
        this.request<TmdbCredits>(`/${type}/${id}/credits`, undefined, abortSignal),
        this.getList(`/${type}/${id}/similar`, { page: 1 }, abortSignal),
        this.request<TmdbImageSet>(`/${type}/${id}/images`, undefined, abortSignal),
        this.getWatchProviders(type, id, abortSignal),
        this.getCertification(type, id, abortSignal),
      ],
    );

    return {
      details,
      cast: credits.cast.slice(0, 8),
      certification,
      images: [...images.backdrops, ...images.posters],
      similar: similar.slice(0, 10),
      trailerUrl: this.findTrailerUrl(videos.results),
      videos: videos.results.filter((video) => video.site === 'YouTube').slice(0, 8),
      watchProviders: providers,
    };
  }

  imageUrl(path: string | null | undefined, size = 'w500'): string | null {
    if (!path) {
      return null;
    }

    return `${this.imageBaseUrl}/${size}${path}`;
  }

  posterUrl(path: string | null | undefined): string {
    return this.imageUrl(path) ?? this.movieFallbackImage;
  }

  profileUrl(path: string | null | undefined): string {
    return this.imageUrl(path, 'w185') ?? this.castFallbackImage;
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

  moneyLabel(value: number | undefined): string {
    if (!value) {
      return 'Unavailable';
    }

    return new Intl.NumberFormat('en-US', {
      currency: 'USD',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  }

  languageLabels(details: TmdbDetails): string {
    const languages = details.spoken_languages
      .map((language) => language.english_name || language.name)
      .filter((language) => language.length > 0);

    return languages.length ? languages.join(', ') : 'Unavailable';
  }

  audioFeedLabels(details: TmdbDetails): string {
    const feeds = details.spoken_languages
      .map((language) => language.english_name || language.name)
      .filter((language) => language.length > 0);

    return feeds.length ? feeds.join(', ') : 'Unavailable';
  }

  originalLanguageLabel(details: TmdbDetails): string {
    const code = details.original_language;
    const spokenLanguage = details.spoken_languages.find((language) => language.iso_639_1 === code);

    return (
      spokenLanguage?.english_name || spokenLanguage?.name || code?.toUpperCase() || 'Unavailable'
    );
  }

  kidsRatingLabel(certification: string | null): string {
    if (!certification) {
      return 'Not rated for kids';
    }

    const kidFriendlyRatings = ['G', 'PG', 'TV-Y', 'TV-Y7', 'TV-G', 'U'];
    return kidFriendlyRatings.includes(certification) ? 'Kids friendly' : 'Parents guide';
  }

  imdbUrl(details: TmdbDetails): string | null {
    if (this.isMovieDetails(details) && details.imdb_id) {
      return `https://www.imdb.com/title/${details.imdb_id}`;
    }

    return null;
  }

  youtubeThumbnail(video: TmdbVideo): string {
    return `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;
  }

  youtubeUrl(video: TmdbVideo): string {
    return `https://www.youtube.com/watch?v=${video.key}`;
  }

  private async getGenres(type: MediaType, abortSignal?: AbortSignal): Promise<TmdbGenre[]> {
    const response = await this.request<{ genres: TmdbGenre[] }>(
      `/genre/${type}/list`,
      undefined,
      abortSignal,
    );

    return response.genres;
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

  private async getWatchProviders(
    type: MediaType,
    id: number,
    abortSignal?: AbortSignal,
  ): Promise<TmdbProvider[]> {
    const response = await this.request<TmdbProviderResponse>(
      `/${type}/${id}/watch/providers`,
      undefined,
      abortSignal,
    );
    const region = response.results['US'] ?? response.results['IN'];

    return region?.flatrate ?? region?.rent ?? region?.buy ?? [];
  }

  private async getCertification(
    type: MediaType,
    id: number,
    abortSignal?: AbortSignal,
  ): Promise<string | null> {
    if (type === 'movie') {
      const response = await this.request<TmdbMovieReleaseDates>(
        `/movie/${id}/release_dates`,
        undefined,
        abortSignal,
      );
      const releaseDates =
        response.results.find((result) => result.iso_3166_1 === 'US')?.release_dates ??
        response.results[0]?.release_dates ??
        [];
      const certification = releaseDates.find((date) => date.certification)?.certification;

      return certification || null;
    }

    const response = await this.request<TmdbTvContentRatings>(
      `/tv/${id}/content_ratings`,
      undefined,
      abortSignal,
    );
    const rating =
      response.results.find((result) => result.iso_3166_1 === 'US')?.rating ??
      response.results[0]?.rating;

    return rating || null;
  }

  private isMovieDetails(details: TmdbDetails): details is TmdbMovieDetails {
    return 'title' in details;
  }
}
