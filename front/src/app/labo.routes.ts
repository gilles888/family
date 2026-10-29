import { Routes } from '@angular/router';
import { parentGuard } from './auth/auth.guards';

/** Pages de travail (développement seulement) : remplacé par une liste vide dans le build de production. */
export const LAB_ROUTES: Routes = [
  { path: 'labo-chambre', canActivate: [parentGuard], loadComponent: () => import('./room/lab/lab-page').then((m) => m.LabPage) },
];
