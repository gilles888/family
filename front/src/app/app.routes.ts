import { Routes } from '@angular/router';
import { LAB_ROUTES } from './labo.routes';
import { roomMemberResolver } from './room/room-member.resolver';
import { authGuard, guestGuard, parentGuard, signedInGuard } from './auth/auth.guards';

export const routes: Routes = [
  { path: 'connexion', canActivate: [guestGuard], loadComponent: () => import('./auth/login-page').then((m) => m.LoginPage) },
  {
    path: 'mot-de-passe',
    canActivate: [signedInGuard],
    loadComponent: () => import('./auth/password-page').then((m) => m.PasswordPage),
  },
  {
    // Tout le reste exige d'être connecté ; les pages de gestion, d'être parent
    path: '',
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./agenda/agenda-page').then((m) => m.AgendaPage) },
      {
        path: 'membres',
        canActivate: [parentGuard],
        loadComponent: () => import('./family-members/family-members-page').then((m) => m.FamilyMembersPage),
      },
      {
        path: 'routines/gerer',
        canActivate: [parentGuard],
        loadComponent: () => import('./routines/routines-manage-page').then((m) => m.RoutinesManagePage),
      },
      {
        path: 'chambre/:memberId',
        resolve: { member: roomMemberResolver },
        loadComponent: () => import('./room/room-view').then((m) => m.RoomView),
      },
      ...LAB_ROUTES,
      { path: 'routines', loadComponent: () => import('./routines/routines-page').then((m) => m.RoutinesPage) },
      {
        path: 'courses',
        canActivate: [parentGuard],
        loadComponent: () => import('./shopping/shopping-page').then((m) => m.ShoppingPage),
      },
      { path: 'recettes', loadComponent: () => import('./recipes/recipes-page').then((m) => m.RecipesPage) },
      {
        path: 'comptes',
        canActivate: [parentGuard],
        loadComponent: () => import('./accounts/accounts-page').then((m) => m.AccountsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
