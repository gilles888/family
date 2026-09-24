import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./agenda/agenda-page').then((m) => m.AgendaPage) },
  {
    path: 'membres',
    loadComponent: () => import('./family-members/family-members-page').then((m) => m.FamilyMembersPage),
  },
  { path: 'recettes', loadComponent: () => import('./recipes/recipes-page').then((m) => m.RecipesPage) },
  { path: '**', redirectTo: '' },
];
