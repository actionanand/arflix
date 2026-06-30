import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import {
  BrowseCategories,
  SearchPageResult,
  SearchRequest,
  SearchSort,
  SearchType,
} from '../../models/tmdb';
import { AuthService } from '../../services/auth.service';
import { TmdbService } from '../../services/tmdb.service';

const emptyBrowseCategories: BrowseCategories = {
  movieGenres: [],
  tvGenres: [],
};

const emptySearchResult: SearchPageResult = {
  items: [],
  totalPages: 0,
  totalResults: 0,
};

@Component({
  selector: 'app-search-page',
  imports: [MediaCardComponent, RouterLink],
  template: `
    <section class="page-head" aria-labelledby="search-title">
      <p class="eyebrow">Search</p>
      <h1 id="search-title">{{ title() }}</h1>
      <form
        class="search-panel search-panel--compact"
        role="search"
        (submit)="submitSearch($event)"
      >
        <label for="search-page-input">Search by title</label>
        <div class="search-panel__row">
          <input
            id="search-page-input"
            type="search"
            name="query"
            autocomplete="off"
            placeholder="Movie, web series, TV serial..."
            [value]="draftQuery()"
            (input)="updateDraftQuery($event)"
          />
          <button type="submit">Go</button>
        </div>
      </form>

      <nav class="filter-tabs" aria-label="Search result type">
        @for (filter of filters; track filter.type) {
          <a
            routerLink="/search"
            [queryParams]="{
              q: query(),
              type: filter.type,
              year: year() || null,
              minRating: minRating() || null,
              sort: sort(),
            }"
            [class.is-active]="type() === filter.type"
            [attr.aria-current]="type() === filter.type ? 'page' : null"
          >
            {{ filter.label }}
          </a>
        }
      </nav>

      <section class="filter-panel" aria-labelledby="filters-title">
        <h2 id="filters-title">Filters</h2>
        <div class="filter-grid">
          <label>
            Year
            <select [value]="year()" (change)="updateFilter('year', selectValue($event))">
              <option value="">Any year</option>
              @for (yearOption of years; track yearOption) {
                <option [value]="yearOption">{{ yearOption }}</option>
              }
            </select>
          </label>

          <label>
            Minimum rating
            <select [value]="minRating()" (change)="updateFilter('minRating', selectValue($event))">
              <option value="0">Any rating</option>
              <option value="5">5+</option>
              <option value="6">6+</option>
              <option value="7">7+</option>
              <option value="8">8+</option>
            </select>
          </label>

          <label>
            Sort
            <select [value]="sort()" (change)="updateFilter('sort', selectValue($event))">
              <option value="relevance">Relevance</option>
              <option value="rating">Top rated</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>
      </section>

      <section class="browse-categories" aria-labelledby="categories-title">
        <div class="section-heading">
          <h2 id="categories-title">Browse by Category</h2>
        </div>

        <div class="category-groups">
          <div>
            <h3>Movies</h3>
            <div class="category-chip-grid">
              @for (genre of categoryResource.value().movieGenres; track genre.id) {
                <a [routerLink]="['/category', 'movie', genre.id]">{{ genre.name }}</a>
              }
            </div>
          </div>

          <div>
            <h3>Web series & TV</h3>
            <div class="category-chip-grid">
              @for (genre of categoryResource.value().tvGenres; track genre.id) {
                <a [routerLink]="['/category', 'tv', genre.id]">{{ genre.name }}</a>
              }
            </div>
          </div>
        </div>
      </section>
    </section>

    @if (!query()) {
      <section class="empty-state">
        <h2>Start with a title</h2>
        <p>Try a movie, a web series, or a TV serial name.</p>
      </section>
    } @else if (searchResource.error()) {
      <section class="notice" aria-live="polite">
        <h2>Search failed</h2>
        <p>Please try again in a moment.</p>
        <button type="button" (click)="searchResource.reload()">Retry</button>
      </section>
    } @else {
      <section class="results-summary" aria-live="polite">
        <p>{{ summary() }}</p>
      </section>

      @if (searchResource.isLoading()) {
        <section class="loading-grid" aria-label="Loading search results">
          @for (item of skeletonItems; track item) {
            <div class="skeleton-card"></div>
          }
        </section>
      }

      @if (!searchResource.isLoading() && searchResource.value().items.length === 0) {
        <section class="empty-state">
          <h2>No results found</h2>
          <p>Try a shorter title or switch the filter.</p>
        </section>
      }

      <section class="media-grid" aria-label="Search results">
        @for (item of searchResource.value().items; track item.mediaType + '-' + item.id) {
          <app-media-card [item]="item" />
        }
      </section>

      @if (query() && searchResource.value().totalPages > 1) {
        <nav class="pager pager--modern" aria-label="Search result pages">
          <button type="button" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">
            Previous
          </button>
          <div class="page-number-list">
            @for (pageNumber of pageNumbers(); track pageNumber) {
              <button
                type="button"
                [class.is-active]="pageNumber === page()"
                [attr.aria-current]="pageNumber === page() ? 'page' : null"
                (click)="goToPage(pageNumber)"
              >
                {{ pageNumber }}
              </button>
            }
          </div>
          <button
            type="button"
            [disabled]="page() >= searchResource.value().totalPages"
            (click)="goToPage(page() + 1)"
          >
            Next
          </button>
        </nav>
      }
    }
  `,
})
export class SearchComponent {
  protected readonly filters: { type: SearchType; label: string }[] = [
    { type: 'all', label: 'All' },
    { type: 'movie', label: 'Movies' },
    { type: 'tv', label: 'Web series & TV' },
  ];
  protected readonly years = this.buildYears();
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly tmdb = inject(TmdbService);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly draftQuery = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  protected readonly query = computed(() => this.queryParams().get('q')?.trim() ?? '');
  protected readonly type = computed<SearchType>(() =>
    this.toSearchType(this.queryParams().get('type')),
  );
  protected readonly page = computed(() => this.toPageNumber(this.queryParams().get('page')));
  protected readonly year = computed(() => this.queryParams().get('year') ?? '');
  protected readonly minRating = computed(() =>
    this.toMinRating(this.queryParams().get('minRating')),
  );
  protected readonly sort = computed<SearchSort>(() => this.toSort(this.queryParams().get('sort')));
  protected readonly title = computed(() =>
    this.query() ? `Results for "${this.query()}"` : 'Find a title',
  );
  protected readonly searchResource = resource<SearchPageResult, SearchRequest | undefined>({
    defaultValue: emptySearchResult,
    params: () => {
      const query = this.query();

      return query
        ? {
            contentFilter: this.auth.contentFilterKey(),
            query,
            minRating: this.minRating(),
            sort: this.sort(),
            type: this.type(),
            page: this.page(),
            year: this.year(),
          }
        : undefined;
    },
    loader: ({ params, abortSignal }) => this.tmdb.search(params, abortSignal),
  });
  protected readonly categoryResource = resource({
    defaultValue: emptyBrowseCategories,
    loader: ({ abortSignal }) => this.tmdb.getBrowseCategories(abortSignal),
  });
  protected readonly summary = computed(() => {
    const count = this.searchResource.value().totalResults;
    const label = this.type() === 'movie' ? 'movie' : this.type() === 'tv' ? 'TV' : 'title';
    return count === 1 ? `1 ${label} found` : `${count.toLocaleString()} ${label}s found`;
  });
  protected readonly pageNumbers = computed(() =>
    this.visiblePageNumbers(this.page(), this.searchResource.value().totalPages),
  );

  protected updateDraftQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.draftQuery.set(input?.value ?? '');

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.commitSearch(true);
    }, 650);
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    this.commitSearch(false);
  }

  protected commitSearch(replaceUrl: boolean): void {
    const query = this.draftQuery().trim();

    void this.router.navigate([], {
      queryParams: {
        q: query || null,
        page: query ? 1 : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      queryParams: {
        page,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected updateFilter(key: 'year' | 'minRating' | 'sort', value: string): void {
    void this.router.navigate([], {
      queryParams: {
        [key]: value || null,
        page: 1,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected selectValue(event: Event): string {
    const select = event.target as HTMLSelectElement | null;
    return select?.value ?? '';
  }

  private toSearchType(value: string | null): SearchType {
    return value === 'movie' || value === 'tv' ? value : 'all';
  }

  private toPageNumber(value: string | null): number {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }

  private toMinRating(value: string | null): number {
    const rating = Number(value);
    return Number.isFinite(rating) && rating > 0 ? rating : 0;
  }

  private toSort(value: string | null): SearchSort {
    return value === 'rating' || value === 'newest' ? value : 'relevance';
  }

  private buildYears(): string[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 45 }, (_, index) => String(currentYear - index));
  }

  private visiblePageNumbers(currentPage: number, totalPages: number): number[] {
    const lastPage = Math.min(totalPages, 500);
    const start = Math.max(1, Math.min(currentPage - 2, lastPage - 4));
    const count = Math.min(5, lastPage);

    return Array.from({ length: count }, (_, index) => start + index).filter(
      (page) => page <= lastPage,
    );
  }
}
