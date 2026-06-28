import { Service, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Service()
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly previousBrowseUrl = signal<string | null>(null);

  readonly canGoBack = computed(() => this.previousBrowseUrl() !== null);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects;

        if (!this.isDetailUrl(url) && !url.startsWith('/404')) {
          this.previousBrowseUrl.set(url);
        }
      });
  }

  goBack(): void {
    const url = this.previousBrowseUrl();

    if (url) {
      void this.router.navigateByUrl(url);
    }
  }

  private isDetailUrl(url: string): boolean {
    return /^\/(movie|tv-show|tv)\//.test(url);
  }
}
