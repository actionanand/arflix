import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-back-to-top',
  host: {
    '(window:scroll)': 'updateVisibility()',
  },
  template: `
    @if (visible()) {
      <button type="button" class="back-to-top" aria-label="Back to top" (click)="scrollToTop()">
        <span class="material-icons" aria-hidden="true">keyboard_arrow_up</span>
      </button>
    }
  `,
})
export class BackToTopComponent {
  protected readonly visible = signal(false);
  private readonly visibleAfterPixels = 360;

  protected updateVisibility(): void {
    this.visible.set(window.scrollY > this.visibleAfterPixels);
  }

  protected scrollToTop(): void {
    window.scrollTo({
      behavior: 'smooth',
      top: 0,
    });
  }
}
