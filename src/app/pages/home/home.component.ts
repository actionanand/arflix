import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { HomeSections } from '../../models/tmdb';
import { TmdbService } from '../../services/tmdb.service';

const emptyHomeSections: HomeSections = {
  trending: [],
  movies: [],
  tvShows: [],
};

@Component({
  selector: 'app-home-page',
  imports: [MediaCardComponent, RouterLink],
  template: `
    <section class="hero" aria-labelledby="home-title">
      <p class="eyebrow">Movies, web series, and TV serials</p>
      <h1 id="home-title">Find what to watch next.</h1>
      <p class="hero__copy">
        Search across films and shows, browse fresh picks, and jump into quick details without extra
        noise.
      </p>

      <form class="search-panel" role="search" (submit)="submitSearch($event)">
        <label for="home-search">Search by title</label>
        <div class="search-panel__row">
          <input
            id="home-search"
            type="search"
            name="query"
            autocomplete="off"
            placeholder="Movie, web series, TV serial..."
            [value]="query()"
            (input)="updateQuery($event)"
          />
          <button type="submit">Search</button>
        </div>
      </form>
    </section>

    @if (homeResource.error()) {
      <section class="notice" aria-live="polite">
        <h2>Unable to load TMDb titles</h2>
        <p>Please check your connection and try again.</p>
        <button type="button" (click)="homeResource.reload()">Retry</button>
      </section>
    } @else {
      @if (heroItem()) {
        <section class="spotlight" aria-labelledby="spotlight-title">
          <div>
            <p class="eyebrow">Trending today</p>
            <h2 id="spotlight-title">{{ heroItem()?.title }}</h2>
            <p>{{ heroOverview() }}</p>
            <a class="button-link" [routerLink]="heroRoute()">View details</a>
          </div>
        </section>
      }

      @if (homeResource.isLoading()) {
        <section class="loading-grid" aria-label="Loading titles">
          @for (item of skeletonItems; track item) {
            <div class="skeleton-card"></div>
          }
        </section>
      }

      <section class="rail" aria-labelledby="trending-title">
        <div class="section-heading">
          <h2 id="trending-title">Trending</h2>
          <a routerLink="/search" [queryParams]="{ q: 'trending', type: 'all' }">Explore</a>
        </div>
        <div class="media-grid media-grid--scroll">
          @for (item of homeResource.value().trending; track item.mediaType + '-' + item.id) {
            <app-media-card [item]="item" />
          }
        </div>
      </section>

      <section class="rail" aria-labelledby="movies-title">
        <div class="section-heading">
          <h2 id="movies-title">Now Playing Movies</h2>
          <a routerLink="/search" [queryParams]="{ q: 'a', type: 'movie' }">More movies</a>
        </div>
        <div class="media-grid media-grid--scroll">
          @for (item of homeResource.value().movies; track item.id) {
            <app-media-card [item]="item" />
          }
        </div>
      </section>

      <section class="rail" aria-labelledby="tv-title">
        <div class="section-heading">
          <h2 id="tv-title">On Air TV</h2>
          <a routerLink="/search" [queryParams]="{ q: 'a', type: 'tv' }">More shows</a>
        </div>
        <div class="media-grid media-grid--scroll">
          @for (item of homeResource.value().tvShows; track item.id) {
            <app-media-card [item]="item" />
          }
        </div>
      </section>
    }
  `,
})
export class HomeComponent {
  protected readonly query = signal('');
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  private readonly router = inject(Router);
  private readonly tmdb = inject(TmdbService);

  protected readonly homeResource = resource({
    defaultValue: emptyHomeSections,
    loader: ({ abortSignal }) => this.tmdb.getHomeSections(abortSignal),
  });

  protected readonly heroItem = computed(() => this.homeResource.value().trending[0]);
  protected readonly heroRoute = computed(() => {
    const item = this.heroItem();
    return item ? [`/${item.mediaType === 'movie' ? 'movie' : 'tv-show'}`, item.id] : ['/'];
  });
  protected readonly heroOverview = computed(() => {
    const overview = this.heroItem()?.overview ?? '';
    return overview.length > 160 ? `${overview.slice(0, 157)}...` : overview;
  });

  protected updateQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.query.set(input?.value ?? '');
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const query = this.query().trim();

    if (!query) {
      return;
    }

    void this.router.navigate(['/search'], {
      queryParams: {
        q: query,
        type: 'all',
      },
    });
  }
}
