import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'ARFlix',
    loadComponent: () =>
      import('./pages/home/home.component').then((component) => component.HomeComponent),
  },
  {
    path: 'search',
    title: 'Search - ARFlix',
    loadComponent: () =>
      import('./pages/search/search.component').then((component) => component.SearchComponent),
  },
  {
    path: 'ar-collection',
    title: 'AR Collection - ARFlix',
    loadComponent: () =>
      import('./pages/ar-collection/ar-collection.component').then(
        (component) => component.ArCollectionComponent,
      ),
  },
  {
    path: 'movies',
    title: 'Popular Movies - ARFlix',
    data: {
      mediaType: 'movie',
    },
    loadComponent: () =>
      import('./pages/category/category.component').then(
        (component) => component.CategoryComponent,
      ),
  },
  {
    path: 'tv-shows',
    title: 'Popular TV - ARFlix',
    data: {
      mediaType: 'tv',
    },
    loadComponent: () =>
      import('./pages/category/category.component').then(
        (component) => component.CategoryComponent,
      ),
  },
  {
    path: 'category/:type/:genreId',
    title: 'Category - ARFlix',
    loadComponent: () =>
      import('./pages/category/category.component').then(
        (component) => component.CategoryComponent,
      ),
  },
  {
    path: 'movie/:id',
    title: 'Movie Details - ARFlix',
    data: {
      mediaType: 'movie',
    },
    loadComponent: () =>
      import('./pages/details/details.component').then((component) => component.DetailsComponent),
  },
  {
    path: 'tv-show/:id',
    title: 'TV Details - ARFlix',
    data: {
      mediaType: 'tv',
    },
    loadComponent: () =>
      import('./pages/details/details.component').then((component) => component.DetailsComponent),
  },
  {
    path: 'tv/:id',
    redirectTo: '/tv-show/:id',
  },
  {
    path: '**',
    title: '404 - ARFlix',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(
        (component) => component.NotFoundComponent,
      ),
  },
];
