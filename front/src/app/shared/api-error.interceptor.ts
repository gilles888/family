import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

/** À poser sur une requête dont l'appelant affiche lui-même l'erreur (pas de snack-bar). */
export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

/** Message traduit pour une erreur HTTP (le backend renvoie des ProblemDetail en français : on ne les affiche pas tels quels). */
export function apiErrorMessage(error: HttpErrorResponse): string {
  switch (true) {
    case error.status === 0:
      return $localize`:@@error.network:Impossible de joindre le serveur. Vérifiez votre connexion.`;
    case error.status === 400:
      return $localize`:@@error.badRequest:Les données envoyées sont invalides. Vérifiez le formulaire.`;
    case error.status === 404:
      return $localize`:@@error.notFound:Élément introuvable : il a peut-être été supprimé.`;
    case error.status === 409:
      return $localize`:@@error.conflict:Cette opération est en conflit avec les données existantes.`;
    case error.status >= 500:
      return $localize`:@@error.server:Le serveur a rencontré une erreur. Réessayez plus tard.`;
    default:
      return $localize`:@@error.unknown:Une erreur inattendue est survenue.`;
  }
}

/** Affiche toute erreur d'API dans un snack-bar, puis la relance pour que l'appelant puisse arrêter ses indicateurs de chargement. */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !req.context.get(SKIP_ERROR_NOTIFICATION)) {
        notifications.error(apiErrorMessage(error));
      }
      return throwError(() => error);
    }),
  );
};
