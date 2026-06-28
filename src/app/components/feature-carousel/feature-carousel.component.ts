import { NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MediaItem } from '../../models/tmdb';
import { TmdbService } from '../../services/tmdb.service';

@Component({
  selector: 'app-feature-carousel',
  imports: [NgOptimizedImage, RouterLink],
  template: `
    @if (activeItem()) {
      <section
        class="feature-carousel"
        aria-labelledby="carousel-title"
        (mouseenter)="pauseAutoPlay()"
        (mouseleave)="startAutoPlay()"
        (focusin)="pauseAutoPlay()"
        (focusout)="startAutoPlay()"
      >
        <div class="feature-carousel__media">
          <img
            [src]="backdropUrl()"
            [alt]="activeItem()?.title + ' backdrop'"
            width="780"
            height="439"
          />
        </div>

        <div class="feature-carousel__content">
          <p class="eyebrow">{{ label() }}</p>
          <h2 id="carousel-title">{{ activeItem()?.title }}</h2>
          <p>{{ overview() }}</p>

          <div class="feature-carousel__facts">
            @if (releaseYear()) {
              <span>{{ releaseYear() }}</span>
            }
            <span>{{ activeItem()?.mediaType === 'movie' ? 'Movie' : 'Web series / TV' }}</span>
            <span class="rating-pill">
              <img ngSrc="assets/images/star.svg" alt="" width="14" height="14" />
              {{ rating() }}
            </span>
          </div>

          <div class="feature-carousel__actions">
            <a class="button-link" [routerLink]="route()">View details</a>
            <div class="carousel-controls" aria-label="Carousel controls">
              <button type="button" (click)="previous()" aria-label="Previous featured title">
                Prev
              </button>
              <button type="button" (click)="next()" aria-label="Next featured title">Next</button>
            </div>
          </div>
        </div>

        <div class="carousel-dots" aria-label="Featured title selector">
          @for (item of visibleItems(); track item.mediaType + '-' + item.id; let index = $index) {
            <button
              type="button"
              [class.is-active]="index === currentIndex()"
              [attr.aria-label]="'Show ' + item.title"
              [attr.aria-current]="index === currentIndex() ? 'true' : null"
              (click)="goTo(index)"
            ></button>
          }
        </div>
      </section>
    }
  `,
})
export class FeatureCarouselComponent implements OnDestroy {
  readonly items = input.required<MediaItem[]>();
  readonly label = input('Featured');

  private readonly tmdb = inject(TmdbService);
  private autoPlayTimer: ReturnType<typeof setInterval> | undefined;
  protected readonly currentIndex = signal(0);
  protected readonly visibleItems = computed(() => this.items().slice(0, 6));
  protected readonly activeItem = computed(() => this.visibleItems()[this.currentIndex()]);
  protected readonly backdropUrl = computed(() => {
    const item = this.activeItem();
    return this.tmdb.backdropUrl(item?.backdropPath) ?? this.tmdb.posterUrl(item?.posterPath);
  });
  protected readonly releaseYear = computed(() => this.activeItem()?.releaseDate.slice(0, 4) ?? '');
  protected readonly overview = computed(() => {
    const text = this.activeItem()?.overview ?? '';
    return text.length > 170 ? `${text.slice(0, 167)}...` : text;
  });
  protected readonly rating = computed(() => {
    const rating = this.activeItem()?.rating ?? 0;
    return rating > 0 ? rating.toFixed(1) : 'New';
  });
  protected readonly route = computed(() => {
    const item = this.activeItem();
    return item ? [`/${item.mediaType === 'movie' ? 'movie' : 'tv-show'}`, item.id] : ['/'];
  });

  constructor() {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.pauseAutoPlay();
  }

  protected next(): void {
    const count = this.visibleItems().length;
    this.currentIndex.update((index) => (count ? (index + 1) % count : 0));
  }

  protected previous(): void {
    const count = this.visibleItems().length;
    this.currentIndex.update((index) => (count ? (index - 1 + count) % count : 0));
  }

  protected goTo(index: number): void {
    this.currentIndex.set(index);
  }

  protected startAutoPlay(): void {
    if (this.autoPlayTimer) {
      return;
    }

    this.autoPlayTimer = setInterval(() => {
      this.next();
    }, 5000);
  }

  protected pauseAutoPlay(): void {
    if (!this.autoPlayTimer) {
      return;
    }

    clearInterval(this.autoPlayTimer);
    this.autoPlayTimer = undefined;
  }
}
