import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./agenda/agenda-page').then((m) => m.AgendaPage) },
  {
    path: 'membres',
    loadComponent: () => import('./family-members/family-members-page').then((m) => m.FamilyMembersPage),
  },
  { path: 'routines', loadComponent: () => import('./routines/routines-page').then((m) => m.RoutinesPage) },
  { path: 'courses', loadComponent: () => import('./shopping/shopping-page').then((m) => m.ShoppingPage) },
  { path: 'recettes', loadComponent: () => import('./recipes/recipes-page').then((m) => m.RecipesPage) },
  { path: '**', redirectTo: '' },
];
