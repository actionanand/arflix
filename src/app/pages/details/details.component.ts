import { Location, NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { DetailsPageData, MediaType, TmdbDetails, TmdbVideo } from '../../models/tmdb';
import { TmdbService } from '../../services/tmdb.service';

const emptyDetails: DetailsPageData = {
  details: {
    adult: false,
    backdrop_path: null,
    budget: 0,
    genres: [],
    id: 0,
    imdb_id: null,
    media_type: 'movie',
    overview: '',
    poster_path: null,
    production_companies: [],
    release_date: '',
    revenue: 0,
    runtime: null,
    spoken_languages: [],
    status: '',
    tagline: '',
    title: '',
  },
  cast: [],
  certification: null,
  images: [],
  similar: [],
  trailerUrl: null,
  videos: [],
  watchProviders: [],
};

interface DetailsRequest {
  id: number;
  type: MediaType;
}

@Component({
  selector: 'app-details-page',
  imports: [MediaCardComponent, NgOptimizedImage],
  template: `
    @if (detailsResource.error()) {
      <section class="not-found" aria-live="polite" aria-labelledby="missing-title">
        <p class="eyebrow">404</p>
        <h1 id="missing-title">Requested page not there</h1>
        <p>The requested movie or web series could not be found.</p>
        <button type="button" class="button-link" (click)="goBack()">Back to results</button>
      </section>
    } @else {
      @if (detailsResource.isLoading()) {
        <section class="detail-loading" aria-label="Loading details">
          <div class="skeleton-card skeleton-card--wide"></div>
          <div class="skeleton-lines"></div>
        </section>
      }

      <article class="detail" aria-labelledby="detail-title">
        <div class="detail__poster">
          <img [src]="posterUrl()" [alt]="title() + ' poster'" width="342" height="513" />
        </div>

        <div class="detail__content">
          <button type="button" class="back-link" (click)="goBack()">Back to results</button>
          <p class="eyebrow">{{ mediaLabel() }}</p>
          <h1 id="detail-title">{{ title() }}</h1>
          @if (tagline()) {
            <p class="tagline">{{ tagline() }}</p>
          }

          <div class="stat-row" aria-label="Title facts">
            <span>{{ releaseYear() || 'Date unavailable' }}</span>
            <span>{{ runtime() }}</span>
            <span class="rating-pill"
              ><img ngSrc="assets/images/star.svg" alt="" width="14" height="14" />
              {{ rating() }}</span
            >
            @if (certification()) {
              <span>{{ certification() }}</span>
            }
            <span [class.badge-danger]="adultBadge() === 'Adult content'">{{ adultBadge() }}</span>
            <span>{{ kidsRating() }}</span>
          </div>

          <p class="overview">{{ overview() || 'Overview unavailable.' }}</p>

          @if (genres().length) {
            <ul class="chip-list" aria-label="Genres">
              @for (genre of genres(); track genre.id) {
                <li>{{ genre.name }}</li>
              }
            </ul>
          }

          <div class="actions">
            @if (detailsResource.value().trailerUrl) {
              <a
                class="button-link"
                [href]="detailsResource.value().trailerUrl"
                target="_blank"
                rel="noopener"
                >Watch trailer</a
              >
            }
            @if (imdbUrl()) {
              <a
                class="button-link button-link--secondary"
                [href]="imdbUrl()"
                target="_blank"
                rel="noopener"
              >
                IMDb reference
              </a>
            }
          </div>
        </div>
      </article>

      <section class="detail-panel" aria-labelledby="info-title">
        <div class="section-heading">
          <h2 id="info-title">Title info</h2>
        </div>
        <dl class="info-grid">
          @for (row of infoRows(); track row.label) {
            <div>
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          }
        </dl>

        <div class="provider-row">
          <h3>OTT info</h3>
          @if (detailsResource.value().watchProviders.length) {
            <div class="provider-list">
              @for (
                provider of detailsResource.value().watchProviders;
                track provider.provider_id
              ) {
                <span>{{ provider.provider_name }}</span>
              }
            </div>
          } @else {
            <p>Streaming availability unavailable.</p>
          }
        </div>
      </section>

      @if (detailsResource.value().cast.length) {
        <section class="rail cast-carousel" aria-labelledby="cast-title">
          <div class="section-heading">
            <h2 id="cast-title">Top cast</h2>
          </div>
          <div class="cast-carousel__body">
            <button
              class="carousel-arrow carousel-arrow--left"
              type="button"
              (click)="previousCast()"
              aria-label="Previous cast members"
            >
              <span class="material-icons" aria-hidden="true">chevron_left</span>
            </button>
            <div class="cast-strip">
              @for (person of visibleCast(); track person.id) {
                <article class="cast-card">
                  <img
                    [src]="profileUrl(person.profile_path)"
                    [alt]="person.name"
                    loading="lazy"
                    width="185"
                    height="278"
                  />
                  <h3>{{ person.name }}</h3>
                  @if (person.character) {
                    <p>{{ person.character }}</p>
                  }
                </article>
              }
            </div>
            <button
              class="carousel-arrow carousel-arrow--right"
              type="button"
              (click)="nextCast()"
              aria-label="Next cast members"
            >
              <span class="material-icons" aria-hidden="true">chevron_right</span>
            </button>
          </div>
        </section>
      }

      @if (detailsResource.value().videos.length || detailsResource.value().images.length) {
        <section class="rail media-tabs" aria-labelledby="media-title">
          <div class="section-heading">
            <h2 id="media-title">Photos & Videos</h2>
          </div>
          <div class="tab-list" role="tablist" aria-label="Photos and videos">
            <button
              type="button"
              role="tab"
              [class.is-active]="mediaTab() === 'photos'"
              [attr.aria-selected]="mediaTab() === 'photos'"
              (click)="mediaTab.set('photos')"
            >
              Photos
            </button>
            <button
              type="button"
              role="tab"
              [class.is-active]="mediaTab() === 'videos'"
              [attr.aria-selected]="mediaTab() === 'videos'"
              (click)="mediaTab.set('videos')"
            >
              Videos
            </button>
          </div>

          @if (mediaTab() === 'photos') {
            <div class="image-grid" role="tabpanel">
              @for (image of visibleImages(); track image.file_path) {
                <button
                  type="button"
                  class="image-card"
                  (click)="selectedImage.set(imageUrl(image.file_path, 'w780'))"
                  [attr.aria-label]="'Open image for ' + title()"
                >
                  <img
                    [src]="imageUrl(image.file_path, 'w342')"
                    alt=""
                    loading="lazy"
                    width="342"
                    height="192"
                  />
                </button>
              }
            </div>
            @if (canLoadMoreImages()) {
              <button type="button" class="load-more-button" (click)="loadMoreImages()">
                Load more photos
              </button>
            }
          } @else {
            <div class="video-grid" role="tabpanel">
              @for (video of detailsResource.value().videos; track video.id) {
                <a class="video-card" [href]="youtubeUrl(video)" target="_blank" rel="noopener">
                  <img
                    [src]="youtubeThumbnail(video)"
                    [alt]="video.name"
                    loading="lazy"
                    width="480"
                    height="360"
                  />
                  <span>{{ video.name }}</span>
                </a>
              }
            </div>
          }
        </section>
      }

      @if (selectedImage()) {
        <div class="image-viewer" role="dialog" aria-modal="true" aria-label="Selected image">
          <button
            type="button"
            class="image-viewer__scrim"
            aria-label="Close selected image"
            (click)="selectedImage.set(null)"
          ></button>
          <button type="button" class="image-viewer__close" (click)="selectedImage.set(null)">
            <span class="material-icons" aria-hidden="true">close</span>
            <span>Close</span>
          </button>
          <a
            class="image-viewer__download"
            [href]="selectedImage()"
            [download]="downloadFileName()"
          >
            <span class="material-icons" aria-hidden="true">download</span>
            <span>Download</span>
          </a>
          <div class="image-viewer__image">
            <img [src]="selectedImage()" [alt]="title() + ' selected image'" />
          </div>
        </div>
      }

      @if (detailsResource.value().similar.length) {
        <section class="rail" aria-labelledby="similar-title">
          <div class="section-heading">
            <h2 id="similar-title">Similar picks</h2>
          </div>
          <div class="media-grid media-grid--scroll">
            @for (item of detailsResource.value().similar; track item.id) {
              <app-media-card [item]="item" />
            }
          </div>
        </section>
      }
    }
  `,
})
export class DetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  protected readonly tmdb = inject(TmdbService);
  protected readonly castIndex = signal(0);
  protected readonly imageVisibleCount = signal(9);
  protected readonly mediaTab = signal<'photos' | 'videos'>('photos');
  protected readonly selectedImage = signal<string | null>(null);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly mediaType = computed<MediaType>(() =>
    this.routeData()['mediaType'] === 'tv' ? 'tv' : 'movie',
  );
  protected readonly id = computed(() => Number(this.paramMap().get('id') ?? 0));
  protected readonly detailsResource = resource<DetailsPageData, DetailsRequest | undefined>({
    defaultValue: emptyDetails,
    params: () => {
      const id = this.id();
      return id > 0
        ? {
            id,
            type: this.mediaType(),
          }
        : undefined;
    },
    loader: ({ params, abortSignal }) => this.tmdb.getDetails(params.type, params.id, abortSignal),
  });
  protected readonly details = computed<TmdbDetails>(() => this.detailsResource.value().details);
  protected readonly title = computed(() => this.tmdb.mediaTitle(this.details()));
  protected readonly mediaLabel = computed(() =>
    this.mediaType() === 'movie' ? 'Movie' : 'Web series / TV serial',
  );
  protected readonly tagline = computed(() => this.details().tagline);
  protected readonly overview = computed(() => this.details().overview ?? '');
  protected readonly genres = computed(() => this.details().genres ?? []);
  protected readonly releaseYear = computed(() => this.tmdb.mediaDate(this.details()).slice(0, 4));
  protected readonly runtime = computed(() => this.tmdb.runtimeLabel(this.details()));
  protected readonly rating = computed(() => {
    const rating = this.details().vote_average ?? 0;
    return rating > 0 ? `${rating.toFixed(1)} / 10` : 'Not rated';
  });
  protected readonly posterUrl = computed(() => this.tmdb.posterUrl(this.details().poster_path));
  protected readonly certification = computed(() => this.detailsResource.value().certification);
  protected readonly kidsRating = computed(() => this.tmdb.kidsRatingLabel(this.certification()));
  protected readonly adultBadge = computed(() => {
    const details = this.details();
    return this.mediaType() === 'movie' && 'adult' in details && details.adult
      ? 'Adult content'
      : 'General content';
  });
  protected readonly imdbUrl = computed(() => this.tmdb.imdbUrl(this.details()));
  protected readonly infoRows = computed(() => {
    const details = this.details();
    const genreNames = details.genres.map((genre) => genre.name).join(', ') || 'Unavailable';
    const companies =
      details.production_companies
        .map((company) => company.name)
        .slice(0, 3)
        .join(', ') || 'Unavailable';

    if (this.mediaType() === 'movie' && 'budget' in details) {
      return [
        { label: 'Release Date', value: this.tmdb.mediaDate(details) || 'Unavailable' },
        { label: 'Audio Feed(s)', value: this.tmdb.audioFeedLabels(details) },
        { label: 'Genre', value: genreNames },
        { label: 'Budget', value: this.tmdb.moneyLabel(details.budget) },
        { label: 'Duration', value: this.runtime() },
        { label: 'Revenue', value: this.tmdb.moneyLabel(details.revenue) },
        { label: 'Languages', value: this.tmdb.languageLabels(details) },
        { label: 'Original Language', value: this.tmdb.originalLanguageLabel(details) },
        { label: 'Status', value: details.status || 'Unavailable' },
        { label: 'Popularity', value: String(Math.round(details.popularity ?? 0)) },
        { label: 'Votes', value: String(details.vote_count ?? 0) },
        { label: 'Production', value: companies },
        { label: 'IMDb Reference', value: details.imdb_id || 'Unavailable' },
      ];
    }

    return [
      { label: 'Release Date', value: this.tmdb.mediaDate(details) || 'Unavailable' },
      { label: 'Audio Feed(s)', value: this.tmdb.audioFeedLabels(details) },
      { label: 'Genre', value: genreNames },
      { label: 'Duration', value: this.runtime() },
      { label: 'Languages', value: this.tmdb.languageLabels(details) },
      { label: 'Original Language', value: this.tmdb.originalLanguageLabel(details) },
      { label: 'Status', value: details.status || 'Unavailable' },
      { label: 'Popularity', value: String(Math.round(details.popularity ?? 0)) },
      { label: 'Votes', value: String(details.vote_count ?? 0) },
      {
        label: 'Seasons',
        value: 'number_of_seasons' in details ? String(details.number_of_seasons) : 'Unavailable',
      },
      {
        label: 'Episodes',
        value: 'number_of_episodes' in details ? String(details.number_of_episodes) : 'Unavailable',
      },
      {
        label: 'Network',
        value:
          'networks' in details
            ? details.networks.map((network) => network.name).join(', ') || 'Unavailable'
            : 'Unavailable',
      },
      {
        label: 'Origin Country',
        value:
          'origin_country' in details
            ? details.origin_country.join(', ') || 'Unavailable'
            : 'Unavailable',
      },
      { label: 'Production', value: companies },
    ];
  });
  protected readonly visibleImages = computed(() =>
    this.detailsResource.value().images.slice(0, this.imageVisibleCount()),
  );
  protected readonly canLoadMoreImages = computed(
    () => this.imageVisibleCount() < this.detailsResource.value().images.length,
  );
  protected readonly downloadFileName = computed(
    () =>
      `${
        this.title()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') || 'arflix-image'
      }.jpg`,
  );
  protected readonly visibleCast = computed(() => {
    const cast = this.detailsResource.value().cast;
    const index = this.castIndex();

    if (cast.length <= 5) {
      return cast;
    }

    return [...cast.slice(index), ...cast.slice(0, index)].slice(0, 5);
  });

  protected profileUrl(path: string | null): string | null {
    return this.tmdb.profileUrl(path);
  }

  protected imageUrl(path: string, size = 'w342'): string {
    return this.tmdb.imageUrl(path, size) ?? this.tmdb.posterFallbackImage;
  }

  protected youtubeThumbnail(video: TmdbVideo): string {
    return this.tmdb.youtubeThumbnail(video);
  }

  protected youtubeUrl(video: TmdbVideo): string {
    return this.tmdb.youtubeUrl(video);
  }

  protected loadMoreImages(): void {
    this.imageVisibleCount.update((count) => count + 9);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected nextCast(): void {
    const castCount = this.detailsResource.value().cast.length;
    this.castIndex.update((index) => (castCount ? (index + 1) % castCount : 0));
  }

  protected previousCast(): void {
    const castCount = this.detailsResource.value().cast.length;
    this.castIndex.update((index) => (castCount ? (index - 1 + castCount) % castCount : 0));
  }
}
