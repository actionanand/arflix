import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { NetworkHelpComponent } from '../../components/network-help/network-help.component';
import { PersonPageData, TmdbPersonDetails } from '../../models/tmdb';
import { ArDatePipe } from '../../pipes/ar-date.pipe';
import { AuthService } from '../../services/auth.service';
import { NavigationHistoryService } from '../../services/navigation-history.service';
import { TmdbService } from '../../services/tmdb.service';

const emptyPerson: PersonPageData = {
  credits: [],
  person: {
    also_known_as: [],
    biography: '',
    birthday: null,
    deathday: null,
    homepage: null,
    id: 0,
    imdb_id: null,
    known_for_department: '',
    name: '',
    place_of_birth: null,
    popularity: 0,
    profile_path: null,
  },
};

interface PersonRequest {
  contentFilter: string;
  id: number;
}

interface PersonInfoRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-person-page',
  imports: [ArDatePipe, MediaCardComponent, NetworkHelpComponent],
  template: `
    @if (personNetworkError()) {
      <app-network-help (retry)="personResource.reload()" />
    } @else if (personNotFound()) {
      <section
        class="not-found not-found--compact"
        aria-live="polite"
        aria-labelledby="person-missing-title"
      >
        <div class="film-loader" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p class="eyebrow">404</p>
        <h1 id="person-missing-title">Cast profile not found</h1>
        <p>The requested cast profile could not be found.</p>
      </section>
    } @else {
      @if (personResource.isLoading()) {
        <section class="detail-loading" aria-label="Loading cast profile">
          <div class="skeleton-card skeleton-card--wide"></div>
          <div class="skeleton-lines"></div>
        </section>
      }

      <article class="detail" aria-labelledby="person-title">
        <div class="detail__poster">
          <img [src]="profileUrl()" [alt]="person().name + ' photo'" width="342" height="513" />
        </div>

        <div class="detail__content">
          <button type="button" class="back-link" [disabled]="!canGoBack()" (click)="goBack()">
            Back
          </button>
          <p class="eyebrow">{{ person().known_for_department || 'Cast profile' }}</p>
          <h1 id="person-title">{{ person().name }}</h1>

          @if (person().biography) {
            <p class="overview">{{ person().biography }}</p>
          } @else {
            <p class="overview">Biography unavailable.</p>
          }

          @if (imdbUrl()) {
            <div class="actions">
              <a
                class="button-link button-link--secondary"
                [href]="imdbUrl()"
                target="_blank"
                rel="noopener"
              >
                IMDb reference
              </a>
            </div>
          }
        </div>
      </article>

      @if (infoRows().length) {
        <section class="detail-panel" aria-labelledby="person-info-title">
          <div class="section-heading">
            <h2 id="person-info-title">Cast info</h2>
          </div>
          <dl class="info-grid">
            @for (row of infoRows(); track row.label) {
              <div>
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value | arDate }}</dd>
              </div>
            }
          </dl>
        </section>
      }

      @if (personResource.value().credits.length) {
        <section class="rail" aria-labelledby="known-for-title">
          <div class="section-heading">
            <h2 id="known-for-title">Known movies & shows</h2>
          </div>
          <div class="media-grid media-grid--scroll">
            @for (item of personResource.value().credits; track item.mediaType + '-' + item.id) {
              <app-media-card [item]="item" />
            }
          </div>
        </section>
      }
    }
  `,
})
export class PersonComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly navigationHistory = inject(NavigationHistoryService);
  protected readonly tmdb = inject(TmdbService);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly id = computed(() => Number(this.paramMap().get('id') ?? 0));
  protected readonly personResource = resource<PersonPageData, PersonRequest | undefined>({
    defaultValue: emptyPerson,
    params: () => {
      const id = this.id();
      return id > 0 ? { contentFilter: this.auth.contentFilterKey(), id } : undefined;
    },
    loader: ({ params, abortSignal }) => this.tmdb.getPerson(params.id, abortSignal),
  });
  protected readonly person = computed<TmdbPersonDetails>(() => this.personResource.value().person);
  protected readonly personNetworkError = computed(() =>
    this.tmdb.isNetworkError(this.personResource.error()),
  );
  protected readonly personNotFound = computed(
    () =>
      this.id() <= 0 ||
      (!!this.personResource.error() && !this.personNetworkError()) ||
      (!this.personResource.isLoading() && this.person().id <= 0),
  );
  protected readonly canGoBack = computed(() => this.navigationHistory.canGoBack());
  protected readonly profileUrl = computed(() => this.tmdb.profileUrl(this.person().profile_path));
  protected readonly imdbUrl = computed(() =>
    this.person().imdb_id ? `https://www.imdb.com/name/${this.person().imdb_id}` : null,
  );
  protected readonly infoRows = computed(() =>
    this.availableRows([
      { label: 'Birthday', value: this.person().birthday },
      { label: 'Deathday', value: this.person().deathday },
      { label: 'Place of Birth', value: this.person().place_of_birth },
      { label: 'Known For', value: this.person().known_for_department },
      { label: 'Also Known As', value: this.person().also_known_as.slice(0, 4).join(', ') },
      { label: 'IMDb Reference', value: this.person().imdb_id },
    ]),
  );

  protected goBack(): void {
    this.navigationHistory.goBack();
  }

  private availableRows(
    rows: { label: string; value: null | string | undefined }[],
  ): PersonInfoRow[] {
    return rows.flatMap((row) => {
      const value = row.value?.trim() ?? '';
      return value ? [{ label: row.label, value }] : [];
    });
  }
}
