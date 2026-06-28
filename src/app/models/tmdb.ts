export type MediaType = 'movie' | 'tv';
export type SearchType = 'all' | MediaType;

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCreator {
  id: number;
  name: string;
}

export interface TmdbNetwork {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface TmdbMediaResult {
  id: number;
  media_type?: MediaType | 'person';
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
}

export interface TmdbPagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  official: boolean;
  site: string;
  type: string;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
}

export interface TmdbMovieDetails extends TmdbMediaResult {
  media_type?: 'movie';
  genres: TmdbGenre[];
  imdb_id: string | null;
  release_date: string;
  runtime: number | null;
  status: string;
  tagline: string;
  title: string;
}

export interface TmdbTvDetails extends TmdbMediaResult {
  media_type?: 'tv';
  created_by: TmdbCreator[];
  episode_run_time: number[];
  first_air_date: string;
  genres: TmdbGenre[];
  name: string;
  networks: TmdbNetwork[];
  number_of_episodes: number;
  number_of_seasons: number;
  status: string;
  tagline: string;
}

export type TmdbDetails = TmdbMovieDetails | TmdbTvDetails;

export interface MediaItem {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  rating: number;
  voteCount: number;
}

export interface SearchRequest {
  query: string;
  type: SearchType;
  page: number;
}

export interface SearchPageResult {
  items: MediaItem[];
  totalPages: number;
  totalResults: number;
}

export interface HomeSections {
  trending: MediaItem[];
  movies: MediaItem[];
  tvShows: MediaItem[];
}

export interface DetailsPageData {
  details: TmdbDetails;
  similar: MediaItem[];
  cast: TmdbCastMember[];
  trailerUrl: string | null;
}
