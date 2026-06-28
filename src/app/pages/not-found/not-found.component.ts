import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="not-found" aria-labelledby="not-found-title">
      <p class="eyebrow">404</p>
      <h1 id="not-found-title">Requested page not there</h1>
      <p>The movie, web series, or page you requested could not be found.</p>
      <a class="button-link" routerLink="/">Go home</a>
    </section>
  `,
})
export class NotFoundComponent {}
