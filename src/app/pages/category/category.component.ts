import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { BrowsePageResult, BrowseRequest, MediaType } from '../../models/tmdb';
import { TmdbService } from '../../services/tmdb.service';

const emptyBrowseResult: BrowsePageResult = {
  genreName: 'Category',
  items: [],
  totalPages: 0,
  totalResults: 0,
};

@Component({
  selector: 'app-category-page',
  imports: [MediaCardComponent],
  template: `
    <section class="page-head" aria-labelledby="category-title">
      <p class="eyebrow">{{ mediaLabel() }}</p>
      <h1 id="category-title">{{ browseResource.value().genreName }}</h1>
      <p class="hero__copy">
        {{ browseResource.value().totalResults.toLocaleString() }} titles to browse
      </p>
    </section>

    @if (browseResource.error()) {
      <section class="notice" aria-live="polite">
        <h2>Category unavailable</h2>
        <p>Please try again in a moment.</p>
        <button type="button" (click)="browseResource.reload()">Retry</button>
      </section>
    } @else {
      @if (browseResource.isLoading()) {
        <section class="loading-grid" aria-label="Loading category">
          @for (item of skeletonItems; track item) {
            <div class="skeleton-card"></div>
          }
        </section>
      }

      <section class="media-grid" aria-label="Category titles">
        @for (item of browseResource.value().items; track item.mediaType + '-' + item.id) {
          <app-media-card [item]="item" />
        }
      </section>

      @if (browseResource.value().totalPages > 1) {
        <nav class="pager pager--modern" aria-label="Category result pages">
          <button type="button" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">
            Previous
          </button>
          <div>
            <strong>{{ page() }}</strong>
            <span>of {{ browseResource.value().totalPages }}</span>
          </div>
          <button
            type="button"
            [disabled]="page() >= browseResource.value().totalPages"
            (click)="goToPage(page() + 1)"
          >
            Next
          </button>
        </nav>
      }
    }
  `,
})
export class CategoryComponent {
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tmdb = inject(TmdbService);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly mediaType = computed<MediaType>(() =>
    this.paramMap().get('type') === 'tv' ? 'tv' : 'movie',
  );
  protected readonly mediaLabel = computed(() =>
    this.mediaType() === 'movie' ? 'Movie category' : 'Web series / TV category',
  );
  protected readonly genreId = computed(() => Number(this.paramMap().get('genreId') ?? 0));
  protected readonly page = computed(() => {
    const page = Number(this.queryParamMap().get('page'));
    return Number.isInteger(page) && page > 0 ? page : 1;
  });
  protected readonly browseResource = resource<BrowsePageResult, BrowseRequest | undefined>({
    defaultValue: emptyBrowseResult,
    params: () => {
      const genreId = this.genreId();

      return genreId > 0
        ? {
            genreId,
            page: this.page(),
            type: this.mediaType(),
          }
        : undefined;
    },
    loader: ({ params, abortSignal }) => this.tmdb.browseByCategory(params, abortSignal),
  });

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      queryParams: {
        page,
      },
      queryParamsHandling: 'merge',
    });
  }
}
