import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';

import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
  host: {
    '(document:keydown.escape)': 'cancel()',
  },
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationDialogService);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const request = this.confirmation.request();
      const dialog = this.dialog()?.nativeElement;

      if (request && dialog) {
        this.previouslyFocused = this.document.activeElement as HTMLElement | null;
        queueMicrotask(() => dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus());
      } else if (!request && this.previouslyFocused) {
        this.previouslyFocused.focus();
        this.previouslyFocused = null;
      }
    });
  }

  protected cancel(): void {
    if (this.confirmation.request()) this.confirmation.cancel();
  }

  protected keepFocusInside(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const dialog = this.dialog()?.nativeElement;
    const controls = dialog?.querySelectorAll<HTMLElement>('button:not([disabled])');
    if (!controls?.length) return;

    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
