import { Service, signal } from '@angular/core';

export interface ConfirmationDialogOptions {
  confirmLabel?: string;
  message: string;
  title: string;
}

export interface ConfirmationDialogRequest extends ConfirmationDialogOptions {
  confirmLabel: string;
}

@Service()
export class ConfirmationDialogService {
  private readonly requestState = signal<ConfirmationDialogRequest | null>(null);
  private resolveRequest: ((confirmed: boolean) => void) | null = null;

  readonly request = this.requestState.asReadonly();

  ask(options: ConfirmationDialogOptions): Promise<boolean> {
    this.finish(false);
    this.requestState.set({
      ...options,
      confirmLabel: options.confirmLabel ?? 'Delete',
    });

    return new Promise<boolean>((resolve) => {
      this.resolveRequest = resolve;
    });
  }

  confirm(): void {
    this.finish(true);
  }

  cancel(): void {
    this.finish(false);
  }

  private finish(confirmed: boolean): void {
    const resolve = this.resolveRequest;
    this.resolveRequest = null;
    this.requestState.set(null);
    resolve?.(confirmed);
  }
}
