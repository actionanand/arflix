import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { SearchPageResult, SearchRequest, SearchType } from '../../models/tmdb';
import { TmdbService } from '../../services/tmdb.service';

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
            [queryParams]="{ q: query(), type: filter.type }"
            [class.is-active]="type() === filter.type"
            [attr.aria-current]="type() === filter.type ? 'page' : null"
          >
            {{ filter.label }}
          </a>
        }
      </nav>
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
        <nav class="pager" aria-label="Search result pages">
          <button type="button" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">
            Previous
          </button>
          <span>Page {{ page() }} of {{ searchResource.value().totalPages }}</span>
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
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tmdb = inject(TmdbService);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly query = computed(() => this.queryParams().get('q')?.trim() ?? '');
  protected readonly type = computed<SearchType>(() =>
    this.toSearchType(this.queryParams().get('type')),
  );
  protected readonly page = computed(() => this.toPageNumber(this.queryParams().get('page')));
  protected readonly draftQuery = computed(() => this.query());
  protected readonly title = computed(() =>
    this.query() ? `Results for "${this.query()}"` : 'Find a title',
  );
  protected readonly searchResource = resource<SearchPageResult, SearchRequest | undefined>({
    defaultValue: emptySearchResult,
    params: () => {
      const query = this.query();

      return query
        ? {
            query,
            type: this.type(),
            page: this.page(),
          }
        : undefined;
    },
    loader: ({ params, abortSignal }) => this.tmdb.search(params, abortSignal),
  });
  protected readonly summary = computed(() => {
    const count = this.searchResource.value().totalResults;
    const label = this.type() === 'movie' ? 'movie' : this.type() === 'tv' ? 'TV' : 'title';
    return count === 1 ? `1 ${label} found` : `${count.toLocaleString()} ${label}s found`;
  });

  protected updateDraftQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    void this.router.navigate([], {
      queryParams: {
        q: input?.value ?? '',
        page: 1,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    void this.router.navigate([], {
      queryParams: {
        q: this.query(),
        page: 1,
      },
      queryParamsHandling: 'merge',
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

  private toSearchType(value: string | null): SearchType {
    return value === 'movie' || value === 'tv' ? value : 'all';
  }

  private toPageNumber(value: string | null): number {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }
}
