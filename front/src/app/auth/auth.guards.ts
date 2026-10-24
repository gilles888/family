import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/** Adresse de retour acceptée après la connexion : un chemin de l'application, jamais un autre site. */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/connexion') ? url : '/';
}

/** Connecté, sinon page de connexion (puis retour à la page demandée). Mot de passe à changer : rien d'autre. */
export const authGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!(await auth.ensureLoaded())) {
    return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
  }
  if (auth.mustChangePassword()) {
    return router.createUrlTree(['/mot-de-passe']);
  }
  return true;
};

/** Pages de gestion (courses, membres, comptes…) : parents seulement. Le backend refuse de toute façon. */
export const parentGuard: CanActivateFn = async (route, state): Promise<boolean | UrlTree> => {
  // inject() avant tout await : après, on n'est plus dans le contexte d'injection
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = await (authGuard(route, state) as Promise<boolean | UrlTree>);
  if (allowed !== true) {
    return allowed;
  }
  return auth.isParent() || router.createUrlTree(['/']);
};

/** Changement de mot de passe : il suffit d'être connecté. */
export const signedInGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.ensureLoaded()) ? true : router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};

/** Page de connexion : déjà connecté, on n'y reste pas. */
export const guestGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!(await auth.ensureLoaded())) {
    return true;
  }
  return router.createUrlTree([auth.mustChangePassword() ? '/mot-de-passe' : '/']);
};
