import { Service, signal } from '@angular/core';

export type SnackbarTone = 'error' | 'success';

export interface SnackbarMessage {
  id: number;
  message: string;
  tone: SnackbarTone;
}

@Service()
export class SnackbarService {
  private readonly messageState = signal<SnackbarMessage | null>(null);
  private dismissTimer: ReturnType<typeof setTimeout> | undefined;
  private nextId = 0;

  readonly message = this.messageState.asReadonly();

  show(message: string, tone: SnackbarTone = 'success', duration = 4200): void {
    this.clearTimer();
    this.nextId += 1;
    this.messageState.set({ id: this.nextId, message, tone });
    this.dismissTimer = setTimeout(() => this.dismiss(), duration);
  }

  dismiss(): void {
    this.clearTimer();
    this.messageState.set(null);
  }

  private clearTimer(): void {
    if (!this.dismissTimer) return;
    clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
  }
}
