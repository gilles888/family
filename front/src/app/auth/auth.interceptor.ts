import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Appels qui gèrent eux-mêmes un 401 (connexion, « qui suis-je ? »). */
const SELF_HANDLED = ['/v1/auth/login', '/v1/auth/me'];

/**
 * 401 (session expirée, compte désactivé…) : retour à la page de connexion, puis à la page en cours.
 * 403 MOT_DE_PASSE_A_CHANGER : page de changement de mot de passe. Les autres 403 sont annoncés par
 * apiErrorInterceptor (« Action non autorisée »).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && !SELF_HANDLED.some((path) => req.url.endsWith(path))) {
          auth.clear();
          if (!router.url.startsWith('/connexion')) {
            void router.navigate(['/connexion'], { queryParams: { retour: router.url } });
          }
        } else if (error.status === 403 && error.error?.code === 'MOT_DE_PASSE_A_CHANGER') {
          auth.requirePasswordChange();
          void router.navigate(['/mot-de-passe']);
        }
      }
      return throwError(() => error);
    }),
  );
};
