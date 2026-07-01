import { NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ArCollectionItem, ArCollectionRow } from '../../models/ar-collection';
import { AuthService } from '../../services/auth.service';
import { ArCollectionService } from '../../services/ar-collection.service';
import { TmdbService } from '../../services/tmdb.service';

type CollectionContentFilter = 'adult' | 'all' | 'movie' | 'tv';

interface CollectionDisplayRow {
  primaryLabel: string;
  sheetLabel: string | null;
  row: ArCollectionRow;
}

interface CollectionPageRequest {
  contentFilter: string;
  rows: ArCollectionRow[];
}

@Component({
  selector: 'app-ar-collection-page',
  imports: [NgOptimizedImage, RouterLink],
  template: `
    <section class="page-head" aria-labelledby="collection-title">
      <p class="eyebrow">Special picks</p>
      <h1 id="collection-title">AR Collection</h1>
      <p class="hero__copy">
        A personal watchlist from the sheet, with posters and ratings added when TMDb has a match.
      </p>

      <form
        class="search-panel search-panel--compact"
        role="search"
        (submit)="preventSubmit($event)"
      >
        <label for="collection-search">Search this collection</label>
        <div class="search-panel__row">
          <input
            id="collection-search"
            type="search"
            name="query"
            autocomplete="off"
            placeholder="Title, platform, language, category..."
            [value]="query()"
            (input)="updateQuery($event)"
          />
        </div>
      </form>

      <section class="collection-filter-panel" aria-labelledby="collection-filters-title">
        <h2 id="collection-filters-title">Collection filters</h2>
        <div class="collection-type-filter" role="group" aria-label="Content type">
          <button
            type="button"
            [class.is-active]="contentFilter() === 'all'"
            [attr.aria-pressed]="contentFilter() === 'all'"
            (click)="updateContentFilter('all')"
          >
            All
          </button>
          <button
            type="button"
            [class.is-active]="contentFilter() === 'tv'"
            [attr.aria-pressed]="contentFilter() === 'tv'"
            (click)="updateContentFilter('tv')"
          >
            Web Series
          </button>
          <button
            type="button"
            [class.is-active]="contentFilter() === 'movie'"
            [attr.aria-pressed]="contentFilter() === 'movie'"
            (click)="updateContentFilter('movie')"
          >
            Movies
          </button>
          @if (canUseAdultFilter()) {
            <button
              type="button"
              [class.is-active]="contentFilter() === 'adult'"
              [attr.aria-pressed]="contentFilter() === 'adult'"
              (click)="updateContentFilter('adult')"
            >
              Only Adult
            </button>
          }
        </div>

        <div class="filter-grid">
          <label>
            Language
            <select [value]="languageFilter()" (change)="updateLanguageFilter(selectValue($event))">
              <option value="all">All languages</option>
              @for (language of languageOptions(); track language) {
                <option [value]="language">{{ language }}</option>
              }
            </select>
          </label>

          <label>
            Category
            <select [value]="categoryFilter()" (change)="updateCategoryFilter(selectValue($event))">
              <option value="all">All categories</option>
              @for (category of categoryOptions(); track category) {
                <option [value]="category">{{ category }}</option>
              }
            </select>
          </label>

          <label>
            Platform
            <select [value]="platformFilter()" (change)="updatePlatformFilter(selectValue($event))">
              <option value="all">All platforms</option>
              @for (platform of platformOptions(); track platform) {
                <option [value]="platform">{{ platform }}</option>
              }
            </select>
          </label>
        </div>
      </section>
    </section>

    @if (sheetResource.error()) {
      <section class="notice" aria-live="polite">
        <h2>Collection unavailable</h2>
        <p>Please check the Google Sheet access and try again.</p>
        <button type="button" (click)="sheetResource.reload()">Retry</button>
      </section>
    } @else {
      <section class="results-summary" aria-live="polite">
        <p>{{ summary() }}</p>
      </section>

      @if (sheetResource.isLoading()) {
        <section class="loading-grid" aria-label="Loading AR Collection">
          @for (item of skeletonItems; track item) {
            <div class="skeleton-card"></div>
          }
        </section>
      }

      @if (!sheetResource.isLoading() && filteredRows().length === 0) {
        <section class="empty-state">
          <h2>No collection match</h2>
          <p>Try a title, platform, language, category, type, or comment from the sheet.</p>
        </section>
      }

      <section class="collection-grid" aria-label="AR Collection titles">
        @for (
          display of pagedDisplayRows();
          track display.row.serialNumber + '-' + display.row.title
        ) {
          @let item = itemFor(display.row);
          <article class="collection-card">
            <div class="collection-card__poster">
              <img
                [src]="posterUrl(item)"
                [alt]="posterAlt(item)"
                loading="lazy"
                width="342"
                height="513"
              />
            </div>

            <div class="collection-card__body">
              <div class="collection-sheet">
                <p class="collection-sheet__meta">
                  <span class="collection-sheet__entry-row">
                    <span class="collection-sheet__entry">{{ display.primaryLabel }}</span>
                    <span>{{ item.sheet.type || 'Title' }}</span>
                  </span>
                  @if (display.sheetLabel) {
                    <span class="collection-sheet__entry collection-sheet__entry--sheet"
                      >({{ display.sheetLabel }})</span
                    >
                  }
                </p>
                <h2>{{ item.sheet.title }}</h2>
                <dl class="collection-facts">
                  <div>
                    <dt>Platform</dt>
                    <dd>{{ valueOrUnavailable(item.sheet.platform) }}</dd>
                  </div>
                  <div>
                    <dt>Language</dt>
                    <dd>{{ valueOrUnavailable(item.sheet.language) }}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{{ categoryLabel(item.sheet.category) }}</dd>
                  </div>
                </dl>
                @if (item.sheet.comment) {
                  <p class="collection-comment">{{ item.sheet.comment }}</p>
                }
              </div>

              @if (item.media) {
                <div class="collection-tmdb">
                  <p class="media-card__meta">
                    <span>{{ mediaLabel(item) }}</span>
                    @if (releaseYear(item)) {
                      <span>{{ releaseYear(item) }}</span>
                    }
                  </p>
                  <p class="media-card__rating" aria-label="Rating {{ ratingLabel(item) }}">
                    <img ngSrc="assets/images/star.svg" alt="" width="14" height="14" />
                    {{ ratingLabel(item) }}
                  </p>
                  @if (item.media.overview) {
                    <p class="collection-overview">{{ item.media.overview }}</p>
                  }
                  <a class="button-link button-link--secondary" [routerLink]="mediaRoute(item)">
                    Open details
                  </a>
                </div>
              } @else {
                <div class="collection-tmdb">
                  @if (pageResource.isLoading()) {
                    <p class="collection-only">Fetching title details</p>
                    <p class="collection-overview">Poster and rating are loading for this page.</p>
                  } @else {
                    <p class="collection-only">Sheet-only entry</p>
                    <p class="collection-overview">
                      TMDb details are unavailable right now, so the sheet details and fallback
                      image are shown.
                    </p>
                  }
                </div>
              }
            </div>
          </article>
        }
      </section>

      @if (totalPages() > 1) {
        <nav class="pager pager--modern" aria-label="AR Collection pages">
          <button type="button" [disabled]="safePage() <= 1" (click)="goToPage(safePage() - 1)">
            Previous
          </button>
          <div class="page-number-list">
            @for (pageNumber of pageNumbers(); track pageNumber) {
              <button
                type="button"
                [class.is-active]="pageNumber === safePage()"
                [attr.aria-current]="pageNumber === safePage() ? 'page' : null"
                (click)="goToPage(pageNumber)"
              >
                {{ pageNumber }}
              </button>
            }
          </div>
          <button
            type="button"
            [disabled]="safePage() >= totalPages()"
            (click)="goToPage(safePage() + 1)"
          >
            Next
          </button>
        </nav>
      }
    }
  `,
})
export class ArCollectionComponent {
  private readonly pageSize = environment.arCollectionPageSize;
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6];
  protected readonly query = signal('');
  protected readonly page = signal(1);
  protected readonly contentFilter = signal<CollectionContentFilter>('all');
  protected readonly languageFilter = signal('all');
  protected readonly categoryFilter = signal('all');
  protected readonly platformFilter = signal('all');

  private readonly collection = inject(ArCollectionService);
  protected readonly auth = inject(AuthService);
  private readonly tmdb = inject(TmdbService);

  protected readonly sheetResource = resource({
    defaultValue: [] as ArCollectionRow[],
    loader: ({ abortSignal }) => this.collection.getSheetRows(abortSignal),
  });
  protected readonly visibleRows = computed(() =>
    this.sheetResource.value().filter((row) => this.auth.canShowAdult() || !this.isAdultRow(row)),
  );
  protected readonly languageOptions = computed(() =>
    this.uniqueOptions(this.visibleRows().map((row) => row.language)),
  );
  protected readonly categoryOptions = computed(() =>
    this.uniqueOptions(this.visibleRows().map((row) => this.categoryLabel(row.category))),
  );
  protected readonly platformOptions = computed(() =>
    this.uniqueOptions(this.visibleRows().map((row) => row.platform)),
  );
  protected readonly canUseAdultFilter = computed(
    () => this.auth.isLoggedIn() && !this.auth.familyOnly(),
  );
  private readonly resetHiddenAdultFilter = effect(() => {
    if (!this.canUseAdultFilter() && this.contentFilter() === 'adult') {
      this.contentFilter.set('all');
      this.page.set(1);
    }
  });
  protected readonly displayRows = computed(() => {
    let visibleEntry = 1;
    let adultEntry = 1;

    return this.visibleRows().map((row): CollectionDisplayRow => {
      if (this.isAdultRow(row)) {
        const primaryLabel = `Adult ${adultEntry}`;
        adultEntry += 1;
        return {
          primaryLabel,
          row,
          sheetLabel: this.auth.isLoggedIn() ? `Google Sheet Entry ${row.sheetRowNumber}` : null,
        };
      }

      const primaryLabel = `#${visibleEntry}`;
      visibleEntry += 1;

      return {
        primaryLabel,
        row,
        sheetLabel: this.auth.isLoggedIn() ? `Google Sheet Entry ${row.sheetRowNumber}` : null,
      };
    });
  });
  protected readonly filteredRows = computed(() => {
    const query = this.query().trim().toLowerCase();
    const rows = this.displayRows();

    return rows
      .filter((display) => this.matchesContentFilter(display.row))
      .filter((display) => this.matchesSelectFilter(display.row.language, this.languageFilter()))
      .filter((display) =>
        this.matchesSelectFilter(this.categoryLabel(display.row.category), this.categoryFilter()),
      )
      .filter((display) => this.matchesSelectFilter(display.row.platform, this.platformFilter()))
      .filter((display) => !query || this.searchText(display.row).includes(query));
  });
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize)),
  );
  protected readonly safePage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly pagedDisplayRows = computed(() => {
    const start = (this.safePage() - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });
  protected readonly pageResource = resource<ArCollectionItem[], CollectionPageRequest>({
    defaultValue: [],
    params: () => ({
      contentFilter: this.auth.contentFilterKey(),
      rows: this.pagedDisplayRows().map((display) => display.row),
    }),
    loader: ({ params, abortSignal }) => this.collection.getMediaForRows(params.rows, abortSignal),
  });
  protected readonly mediaByRowKey = computed(() => {
    const mediaMap = new Map<string, ArCollectionItem>();

    this.pageResource.value().forEach((item) => {
      mediaMap.set(this.rowKey(item.sheet), item);
    });

    return mediaMap;
  });
  protected readonly pageNumbers = computed(() =>
    this.visiblePageNumbers(this.safePage(), this.totalPages()),
  );
  protected readonly summary = computed(() => {
    const total = this.visibleRows().length;
    const filtered = this.filteredRows().length;

    if (this.sheetResource.isLoading()) {
      return 'Loading your collection';
    }

    if (!this.query() && !this.hasActiveFilters()) {
      return total === 1 ? '1 collection title' : `${total} collection titles`;
    }

    return filtered === 1 ? '1 collection match' : `${filtered} collection matches`;
  });

  protected updateQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.query.set(input?.value ?? '');
    this.page.set(1);
  }

  protected preventSubmit(event: Event): void {
    event.preventDefault();
  }

  protected updateContentFilter(value: CollectionContentFilter): void {
    this.contentFilter.set(value === 'adult' && !this.canUseAdultFilter() ? 'all' : value);
    this.page.set(1);
  }

  protected updateLanguageFilter(value: string): void {
    this.languageFilter.set(this.optionOrAll(value, this.languageOptions()));
    this.page.set(1);
  }

  protected updateCategoryFilter(value: string): void {
    this.categoryFilter.set(this.optionOrAll(value, this.categoryOptions()));
    this.page.set(1);
  }

  protected updatePlatformFilter(value: string): void {
    this.platformFilter.set(this.optionOrAll(value, this.platformOptions()));
    this.page.set(1);
  }

  protected selectValue(event: Event): string {
    const select = event.target as HTMLSelectElement | null;
    return select?.value ?? 'all';
  }

  protected goToPage(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), this.totalPages()));
  }

  protected itemFor(row: ArCollectionRow): ArCollectionItem {
    return (
      this.mediaByRowKey().get(this.rowKey(row)) ?? {
        sheet: row,
        media: null,
      }
    );
  }

  protected posterUrl(item: ArCollectionItem): string {
    return this.tmdb.posterUrl(item.media?.posterPath);
  }

  protected posterAlt(item: ArCollectionItem): string {
    return item.media ? `${item.sheet.title} poster` : `${item.sheet.title} poster unavailable`;
  }

  protected valueOrUnavailable(value: string): string {
    return value || 'Unavailable';
  }

  protected categoryLabel(value: string): string {
    return value.toLowerCase() === 'normal' ? 'General' : this.valueOrUnavailable(value);
  }

  protected mediaLabel(item: ArCollectionItem): string {
    return item.media?.mediaType === 'movie' ? 'Movie match' : 'TV match';
  }

  protected isAdultItem(item: ArCollectionItem): boolean {
    return this.isAdultRow(item.sheet);
  }

  protected isAdultRow(row: ArCollectionRow): boolean {
    return this.auth.isAdultValue(row.isAdult);
  }

  protected typeLabel(type: string): string {
    const normalized = type.toLowerCase();

    if (normalized.includes('movie') || normalized.includes('film')) {
      return 'Movie';
    }

    return 'Web Series';
  }

  protected releaseYear(item: ArCollectionItem): string {
    return item.media?.releaseDate.slice(0, 4) ?? '';
  }

  protected ratingLabel(item: ArCollectionItem): string {
    const rating = item.media?.rating ?? 0;
    return rating > 0 ? rating.toFixed(1) : 'New';
  }

  protected mediaRoute(item: ArCollectionItem): string[] {
    if (!item.media) {
      return ['/ar-collection'];
    }

    return [`/${item.media.mediaType === 'movie' ? 'movie' : 'tv-show'}`, String(item.media.id)];
  }

  private rowKey(row: ArCollectionRow): string {
    return `${row.serialNumber}-${row.title}`;
  }

  private searchText(row: ArCollectionRow): string {
    return [
      row.title,
      row.type,
      row.platform,
      row.language,
      row.category,
      this.categoryLabel(row.category),
      row.comment,
    ]
      .join(' ')
      .toLowerCase();
  }

  private matchesContentFilter(row: ArCollectionRow): boolean {
    const filter = this.contentFilter();

    if (filter === 'adult') {
      return this.canUseAdultFilter() && this.isAdultRow(row);
    }

    if (filter === 'movie') {
      return this.typeLabel(row.type) === 'Movie';
    }

    if (filter === 'tv') {
      return this.typeLabel(row.type) === 'Web Series';
    }

    return true;
  }

  private matchesSelectFilter(value: string, filter: string): boolean {
    return filter === 'all' || this.normalizeOption(value) === this.normalizeOption(filter);
  }

  private hasActiveFilters(): boolean {
    return (
      this.contentFilter() !== 'all' ||
      this.languageFilter() !== 'all' ||
      this.categoryFilter() !== 'all' ||
      this.platformFilter() !== 'all'
    );
  }

  private uniqueOptions(values: string[]): string[] {
    const options = new Map<string, string>();

    values
      .map((value) => this.valueOrUnavailable(value))
      .filter((value) => value !== 'Unavailable')
      .forEach((value) => {
        options.set(this.normalizeOption(value), value);
      });

    return Array.from(options.values()).sort((first, second) => first.localeCompare(second));
  }

  private normalizeOption(value: string): string {
    return value.trim().toLowerCase();
  }

  private optionOrAll(value: string, options: string[]): string {
    return value === 'all' || options.some((option) => option === value) ? value : 'all';
  }

  private visiblePageNumbers(currentPage: number, totalPages: number): number[] {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const count = Math.min(5, totalPages);

    return Array.from({ length: count }, (_, index) => start + index).filter(
      (page) => page <= totalPages,
    );
  }
}
