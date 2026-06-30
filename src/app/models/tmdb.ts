export type MediaType = 'movie' | 'tv';
export type SearchType = 'all' | MediaType;
export type SearchSort = 'relevance' | 'rating' | 'newest';

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

export interface TmdbSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TmdbProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TmdbMediaResult {
  adult?: boolean;
  id: number;
  media_type?: MediaType | 'person';
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  original_language?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
}

export interface TmdbPersonDetails {
  also_known_as: string[];
  biography: string;
  birthday: string | null;
  deathday: string | null;
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  known_for_department: string;
  name: string;
  place_of_birth: string | null;
  popularity: number;
  profile_path: string | null;
}

export interface TmdbPersonCredit extends TmdbMediaResult {
  character?: string;
  credit_id: string;
  job?: string;
  order?: number;
}

export interface TmdbPersonCombinedCredits {
  cast: TmdbPersonCredit[];
  crew: TmdbPersonCredit[];
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

export interface TmdbImageSet {
  backdrops: TmdbImage[];
  posters: TmdbImage[];
}

export interface TmdbImage {
  file_path: string;
  height: number;
  width: number;
}

export interface TmdbProviderResponse {
  results: Record<string, TmdbRegionProviders>;
}

export interface TmdbRegionProviders {
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbProvider {
  logo_path: string | null;
  provider_id: number;
  provider_name: string;
}

export interface TmdbMovieReleaseDates {
  results: {
    iso_3166_1: string;
    release_dates: {
      certification: string;
      type: number;
    }[];
  }[];
}

export interface TmdbTvContentRatings {
  results: {
    iso_3166_1: string;
    rating: string;
  }[];
}

export interface TmdbMovieDetails extends TmdbMediaResult {
  adult: boolean;
  budget: number;
  media_type?: 'movie';
  genres: TmdbGenre[];
  imdb_id: string | null;
  production_companies: TmdbProductionCompany[];
  release_date: string;
  revenue: number;
  runtime: number | null;
  spoken_languages: TmdbSpokenLanguage[];
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
  homepage: string;
  languages: string[];
  name: string;
  networks: TmdbNetwork[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  production_companies: TmdbProductionCompany[];
  spoken_languages: TmdbSpokenLanguage[];
  status: string;
  tagline: string;
  type: string;
}

export type TmdbDetails = TmdbMovieDetails | TmdbTvDetails;

export interface MediaItem {
  adult: boolean;
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
  contentFilter: string;
  minRating: number;
  query: string;
  sort: SearchSort;
  type: SearchType;
  page: number;
  year: string;
}

export interface SearchPageResult {
  items: MediaItem[];
  totalPages: number;
  totalResults: number;
}

export interface HomeSections {
  inTheatres: MediaItem[];
  trending: MediaItem[];
  movies: MediaItem[];
  tvShows: MediaItem[];
  movieGenres: TmdbGenre[];
  tvGenres: TmdbGenre[];
}

export interface BrowseCategories {
  movieGenres: TmdbGenre[];
  tvGenres: TmdbGenre[];
}

export interface DetailsPageData {
  details: TmdbDetails;
  similar: MediaItem[];
  cast: TmdbCastMember[];
  certification: string | null;
  images: TmdbImage[];
  trailerUrl: string | null;
  videos: TmdbVideo[];
  watchProviders: TmdbProvider[];
}

export interface PersonPageData {
  credits: MediaItem[];
  person: TmdbPersonDetails;
}

export interface BrowseRequest {
  contentFilter: string;
  genreId?: number;
  page: number;
  type: MediaType;
}

export interface BrowsePageResult {
  genreName: string;
  items: MediaItem[];
  totalPages: number;
  totalResults: number;
}
