import { Component, inject, signal } from '@angular/core';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-dialog',
  template: `
    @if (auth.dialogOpen()) {
      <div class="auth-overlay" role="presentation">
        <section
          class="auth-dialog"
          [class.auth-dialog--wobble]="wobble()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
        >
          <button
            type="button"
            class="auth-dialog__close"
            aria-label="Close login"
            (click)="close()"
          >
            <span class="material-icons" aria-hidden="true">close</span>
          </button>

          <p class="eyebrow">Private access</p>
          <h2 id="auth-title">Login</h2>

          <form class="auth-form" (submit)="submit($event)">
            <label>
              User name
              <input
                type="text"
                name="userName"
                autocomplete="username"
                [value]="userName()"
                (input)="updateUserName($event)"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                autocomplete="current-password"
                [value]="password()"
                (input)="updatePassword($event)"
              />
            </label>

            @if (message()) {
              <p
                class="auth-message"
                [class.auth-message--success]="messageType() === 'success'"
                aria-live="polite"
              >
                {{ message() }}
              </p>
            }

            <button type="submit" [disabled]="isSubmitting()">
              {{ isSubmitting() ? 'Checking...' : 'Login' }}
            </button>
          </form>
        </section>
      </div>
    }
  `,
})
export class AuthDialogComponent {
  protected readonly auth = inject(AuthService);
  protected readonly userName = signal('');
  protected readonly password = signal('');
  protected readonly message = signal('');
  protected readonly messageType = signal<'error' | 'success'>('error');
  protected readonly wobble = signal(false);
  protected readonly isSubmitting = signal(false);

  protected updateUserName(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.userName.set(input?.value ?? '');
  }

  protected updatePassword(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.password.set(input?.value ?? '');
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const didLogin = await this.auth.login(this.userName(), this.password());
    this.isSubmitting.set(false);

    if (didLogin) {
      this.messageType.set('success');
      this.message.set('Login successful.');
      this.password.set('');
      setTimeout(() => this.close(), 800);
      return;
    }

    this.messageType.set('error');
    this.message.set('Wrong password. Please re-enter.');
    this.password.set('');
    this.wobble.set(false);
    setTimeout(() => this.wobble.set(true), 0);
    setTimeout(() => this.wobble.set(false), 420);
  }

  protected close(): void {
    this.auth.closeDialog();
    this.message.set('');
    this.messageType.set('error');
    this.wobble.set(false);
    this.isSubmitting.set(false);
  }
}
