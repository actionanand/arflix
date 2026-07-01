import { Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-network-help',
  imports: [RouterLink],
  template: `
    <section class="notice network-help" aria-live="polite" aria-labelledby="network-help-title">
      <p class="eyebrow">Connection help</p>
      <h2 id="network-help-title">TMDb is not reachable</h2>
      <p>
        Some networks can block or fail DNS lookups for themoviedb.org. ARFlix is working, but movie
        posters, videos, cast, and ratings may need a DNS or VPN change.
      </p>

      <div class="network-help__steps">
        <div class="network-help__step">
          <h3>Change DNS</h3>
          <p>
            Set your Wi-Fi, phone IP settings, or router DNS to Cloudflare
            <strong>1.1.1.1</strong> / <strong>1.0.0.1</strong> or Google <strong>8.8.8.8</strong> /
            <strong>8.8.4.4</strong>, then reopen this page.
          </p>
        </div>

        <div class="network-help__step">
          <h3>Use a VPN</h3>
          <p>
            If changing DNS is not possible on the current network, connect to a trusted VPN and
            retry the page.
          </p>
        </div>

        <div class="network-help__step">
          <h3>Browse saved picks</h3>
          <p>
            Meanwhile, AR Collection can still show the Google Sheet entries with fallback images.
          </p>
        </div>
      </div>

      <div class="network-help__actions">
        <button type="button" (click)="retry.emit()">Retry TMDb</button>
        <a class="button-link button-link--secondary" routerLink="/ar-collection">
          Open AR Collection
        </a>
      </div>
    </section>
  `,
})
export class NetworkHelpComponent {
  readonly retry = output<void>();
}
