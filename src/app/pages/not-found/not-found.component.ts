import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="not-found" aria-labelledby="not-found-title">
      <div class="film-loader" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p class="eyebrow">404</p>
      <h1 id="not-found-title">Requested page not there</h1>
      <p>The movie, web series, or page you requested could not be found.</p>
      <a class="button-link button-link--fit" routerLink="/">Go home</a>
    </section>
  `,
})
export class NotFoundComponent {}
