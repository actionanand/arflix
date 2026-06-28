import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { DetailsPageData, MediaType, TmdbDetails } from '../../models/tmdb';
import { TmdbService } from '../../services/tmdb.service';

const emptyDetails: DetailsPageData = {
  details: {
    backdrop_path: null,
    genres: [],
    id: 0,
    imdb_id: null,
    media_type: 'movie',
    overview: '',
    poster_path: null,
    release_date: '',
    runtime: null,
    status: '',
    tagline: '',
    title: '',
  },
  cast: [],
  similar: [],
  trailerUrl: null,
};

interface DetailsRequest {
  id: number;
  type: MediaType;
}

@Component({
  selector: 'app-details-page',
  imports: [MediaCardComponent, RouterLink],
  template: `
    @if (detailsResource.error()) {
      <section class="notice" aria-live="polite">
        <h1>Details unavailable</h1>
        <p>Please try again in a moment.</p>
        <button type="button" (click)="detailsResource.reload()">Retry</button>
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
          @if (posterUrl()) {
            <img [src]="posterUrl()" [alt]="title() + ' poster'" width="342" height="513" />
          } @else {
            <div class="media-card__fallback media-card__fallback--large" aria-hidden="true">
              <span>{{ title().slice(0, 2).toUpperCase() }}</span>
            </div>
          }
        </div>

        <div class="detail__content">
          <a class="back-link" routerLink="/">Back home</a>
          <p class="eyebrow">{{ mediaLabel() }}</p>
          <h1 id="detail-title">{{ title() }}</h1>
          @if (tagline()) {
            <p class="tagline">{{ tagline() }}</p>
          }

          <div class="stat-row" aria-label="Title facts">
            <span>{{ releaseYear() || 'Date unavailable' }}</span>
            <span>{{ runtime() }}</span>
            <span>{{ rating() }}</span>
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
            <a
              class="button-link button-link--secondary"
              routerLink="/search"
              [queryParams]="{ q: title(), type: mediaType() }"
            >
              Find similar
            </a>
          </div>
        </div>
      </article>

      @if (detailsResource.value().cast.length) {
        <section class="rail" aria-labelledby="cast-title">
          <div class="section-heading">
            <h2 id="cast-title">Top cast</h2>
          </div>
          <div class="cast-strip">
            @for (person of detailsResource.value().cast; track person.id) {
              <article class="cast-card">
                @if (profileUrl(person.profile_path)) {
                  <img
                    [src]="profileUrl(person.profile_path)"
                    [alt]="person.name"
                    loading="lazy"
                    width="185"
                    height="278"
                  />
                }
                <h3>{{ person.name }}</h3>
                @if (person.character) {
                  <p>{{ person.character }}</p>
                }
              </article>
            }
          </div>
        </section>
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
  private readonly tmdb = inject(TmdbService);
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
  protected readonly posterUrl = computed(() => this.tmdb.imageUrl(this.details().poster_path));

  protected profileUrl(path: string | null): string | null {
    return this.tmdb.imageUrl(path, 'w185');
  }
}
