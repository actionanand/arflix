import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MediaItem } from '../../models/tmdb';
import { TmdbService } from '../../services/tmdb.service';

@Component({
  selector: 'app-media-card',
  imports: [RouterLink],
  template: `
    <a class="media-card" [routerLink]="route()" [attr.aria-label]="ariaLabel()">
      <div class="media-card__poster">
        @if (posterUrl()) {
          <img [src]="posterUrl()" [alt]="posterAlt()" loading="lazy" width="342" height="513" />
        } @else {
          <div class="media-card__fallback" aria-hidden="true">
            <span>{{ initials() }}</span>
          </div>
        }
      </div>

      <div class="media-card__body">
        <p class="media-card__meta">
          <span>{{ mediaLabel() }}</span>
          @if (releaseYear()) {
            <span>{{ releaseYear() }}</span>
          }
        </p>
        <h3>{{ item().title }}</h3>
        <p class="media-card__rating" aria-label="Rating {{ ratingLabel() }}">
          Rating {{ ratingLabel() }}
        </p>
      </div>
    </a>
  `,
})
export class MediaCardComponent {
  readonly item = input.required<MediaItem>();

  private readonly tmdb = inject(TmdbService);

  protected readonly route = computed(() => [
    `/${this.item().mediaType === 'movie' ? 'movie' : 'tv-show'}`,
    this.item().id,
  ]);
  protected readonly posterUrl = computed(() => this.tmdb.imageUrl(this.item().posterPath));
  protected readonly posterAlt = computed(() => `${this.item().title} poster`);
  protected readonly releaseYear = computed(() => this.item().releaseDate.slice(0, 4));
  protected readonly mediaLabel = computed(() =>
    this.item().mediaType === 'movie' ? 'Movie' : 'TV',
  );
  protected readonly ratingLabel = computed(() =>
    this.item().rating > 0 ? this.item().rating.toFixed(1) : 'New',
  );
  protected readonly ariaLabel = computed(
    () => `Open ${this.item().title} ${this.mediaLabel()} details`,
  );
  protected readonly initials = computed(() =>
    this.item()
      .title.split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase(),
  );
}
