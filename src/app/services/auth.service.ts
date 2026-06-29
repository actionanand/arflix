import { computed, Service, signal } from '@angular/core';

import { environment } from '../../environments/environment';

interface StoredAuth {
  preferences?: {
    showFamilyContent?: unknown;
  };
  user?: {
    credentials?: {
      passwordHash?: unknown;
    };
    name?: unknown;
  };
}

@Service()
export class AuthService {
  private readonly storageKey = 'arflix.auth';
  private readonly expectedHash = environment.passwordHash.toLowerCase();

  readonly dialogOpen = signal(false);
  readonly isLoggedIn = signal(this.hasValidStoredHash());
  readonly familyOnly = signal(this.readStoredFamilyOnly());
  readonly canShowAdult = computed(() => this.isLoggedIn() && !this.familyOnly());
  readonly contentFilterKey = computed(() => (this.canShowAdult() ? 'all-content' : 'family'));

  openDialog(): void {
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  async login(userName: string, password: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);

    if (!this.isExpectedHash(passwordHash)) {
      this.clearStoredUser();
      this.isLoggedIn.set(false);
      return false;
    }

    this.isLoggedIn.set(true);
    this.writeStore({
      preferences: {
        showFamilyContent: this.familyOnly(),
      },
      user: {
        name: userName.trim(),
        credentials: {
          passwordHash,
        },
      },
    });
    return true;
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.writeStore({
      preferences: {
        showFamilyContent: this.familyOnly(),
      },
    });
  }

  setFamilyOnly(value: boolean): void {
    this.familyOnly.set(value);
    const store = this.readStore();

    this.writeStore({
      ...store,
      preferences: {
        ...store.preferences,
        showFamilyContent: value,
      },
    });
  }

  isAdultValue(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return ['1', 'adult', 'true', 'y', 'yes'].includes(normalized);
  }

  private hasValidStoredHash(): boolean {
    const store = this.readStore();
    const storedHash = store.user?.credentials?.passwordHash;
    const isValid = typeof storedHash === 'string' && this.isExpectedHash(storedHash);

    if (!isValid && storedHash) {
      this.clearStoredUser();
    }

    return isValid;
  }

  private readStoredFamilyOnly(): boolean {
    return this.readStore().preferences?.showFamilyContent === true;
  }

  private isExpectedHash(hash: string): boolean {
    return hash.toLowerCase() === this.expectedHash && this.expectedHash.length > 0;
  }

  private readStore(): StoredAuth {
    try {
      const text = localStorage.getItem(this.storageKey);
      const parsed: unknown = text ? JSON.parse(text) : {};
      return this.isStoredAuth(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeStore(store: StoredAuth): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(store));
    } catch {
      return;
    }
  }

  private clearStoredUser(): void {
    const store = this.readStore();

    this.writeStore({
      preferences: store.preferences,
    });
  }

  private isStoredAuth(value: unknown): value is StoredAuth {
    return typeof value === 'object' && value !== null;
  }

  private async hashPassword(password: string): Promise<string> {
    const bytes = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', bytes);

    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
