import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArCollectionItem } from '../../models/ar-collection';
import { AuthService } from '../../services/auth.service';
import { ArCollectionService } from '../../services/ar-collection.service';
import { TmdbService } from '../../services/tmdb.service';

interface CollectionDisplayItem {
  entryLabel: string;
  item: ArCollectionItem;
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
    </section>

    @if (collectionResource.error()) {
      <section class="notice" aria-live="polite">
        <h2>Collection unavailable</h2>
        <p>Please check the Google Sheet access and try again.</p>
        <button type="button" (click)="collectionResource.reload()">Retry</button>
      </section>
    } @else {
      <section class="results-summary" aria-live="polite">
        <p>{{ summary() }}</p>
      </section>

      @if (collectionResource.isLoading()) {
        <section class="loading-grid" aria-label="Loading AR Collection">
          @for (item of skeletonItems; track item) {
            <div class="skeleton-card"></div>
          }
        </section>
      }

      @if (!collectionResource.isLoading() && filteredItems().length === 0) {
        <section class="empty-state">
          <h2>No collection match</h2>
          <p>Try a title, platform, language, category, type, or comment from the sheet.</p>
        </section>
      }

      <section class="collection-grid" aria-label="AR Collection titles">
        @for (
          display of displayItems();
          track display.item.sheet.serialNumber + '-' + display.item.sheet.title
        ) {
          @let item = display.item;
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
                  <span>{{ display.entryLabel }}</span>
                  <span>{{ item.sheet.type || 'Title' }}</span>
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
                  <p class="collection-only">Sheet-only entry</p>
                  <p class="collection-overview">No matching TMDb poster or details were found.</p>
                </div>
              }
            </div>
          </article>
        }
      </section>
    }
  `,
})
export class ArCollectionComponent {
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6];
  protected readonly query = signal('');

  private readonly collection = inject(ArCollectionService);
  protected readonly auth = inject(AuthService);
  private readonly tmdb = inject(TmdbService);

  protected readonly collectionResource = resource({
    defaultValue: [] as ArCollectionItem[],
    loader: ({ abortSignal }) => this.collection.getCollection(abortSignal),
  });
  protected readonly visibleItems = computed(() =>
    this.collectionResource
      .value()
      .filter((item) => this.auth.canShowAdult() || !this.isAdultItem(item)),
  );
  protected readonly filteredItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    const items = this.visibleItems();

    if (!query) {
      return items;
    }

    return items.filter((item) => this.searchText(item).includes(query));
  });
  protected readonly displayItems = computed(() => {
    let sheetEntry = 2;
    let adultEntry = 1;

    return this.filteredItems().map((item): CollectionDisplayItem => {
      if (this.isAdultItem(item)) {
        const entryLabel = `Adult ${adultEntry} - ${this.typeLabel(item.sheet.type)}`;
        adultEntry += 1;
        return { entryLabel, item };
      }

      const entryLabel = `Google Sheet Entry ${sheetEntry}`;
      sheetEntry += 1;
      return { entryLabel, item };
    });
  });
  protected readonly summary = computed(() => {
    const total = this.visibleItems().length;
    const filtered = this.filteredItems().length;

    if (this.collectionResource.isLoading()) {
      return 'Loading your collection';
    }

    if (!this.query()) {
      return total === 1 ? '1 collection title' : `${total} collection titles`;
    }

    return filtered === 1 ? '1 sheet match' : `${filtered} sheet matches`;
  });

  protected updateQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.query.set(input?.value ?? '');
  }

  protected preventSubmit(event: Event): void {
    event.preventDefault();
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
    return this.auth.isAdultValue(item.sheet.isAdult);
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

  private searchText(item: ArCollectionItem): string {
    return [
      item.sheet.title,
      item.sheet.type,
      item.sheet.platform,
      item.sheet.language,
      item.sheet.category,
      this.categoryLabel(item.sheet.category),
      item.sheet.comment,
    ]
      .join(' ')
      .toLowerCase();
  }
}
