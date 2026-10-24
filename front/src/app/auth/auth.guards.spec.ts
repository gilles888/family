import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { MeDTO } from '../api-client';
import { authGuard, guestGuard, parentGuard, safeReturnUrl } from './auth.guards';
import { provideFakeAuth } from './testing';

function run(guard: typeof authGuard, url = '/recettes'): Promise<boolean | UrlTree> {
  return TestBed.runInInjectionContext(
    () => guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as Promise<boolean | UrlTree>,
  );
}

function setup(role: MeDTO.RoleEnum | null, overrides: Partial<MeDTO> = {}): Router {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideFakeAuth(role, overrides)] });
  return TestBed.inject(Router);
}

describe('gardes de route', () => {
  it('non connecté : page de connexion, avec retour à la page demandée', async () => {
    const router = setup(null);
    const result = await run(authGuard, '/recettes?x=1');

    expect(router.serializeUrl(result as UrlTree)).toBe('/connexion?retour=%2Frecettes%3Fx%3D1');
  });

  it('connecté : accès', async () => {
    setup('ENFANT');
    expect(await run(authGuard)).toBe(true);
  });

  it('mot de passe à changer : seule la page de changement', async () => {
    const router = setup('PARENT', { doitChangerMotDePasse: true });
    expect(router.serializeUrl((await run(authGuard)) as UrlTree)).toBe('/mot-de-passe');
  });

  it('pages de gestion réservées aux parents', async () => {
    const router = setup('ENFANT');
    expect(router.serializeUrl((await run(parentGuard, '/comptes')) as UrlTree)).toBe('/');
  });

  it('parent : pages de gestion accessibles', async () => {
    setup('PARENT');
    expect(await run(parentGuard, '/comptes')).toBe(true);
  });

  it('page de connexion : déjà connecté, retour à l’accueil', async () => {
    const router = setup('PARENT');
    expect(router.serializeUrl((await run(guestGuard, '/connexion')) as UrlTree)).toBe('/');
  });

  it('adresse de retour : chemin de l’application seulement', () => {
    expect(safeReturnUrl('/routines?membre=3')).toBe('/routines?membre=3');
    expect(safeReturnUrl('https://exemple.org')).toBe('/');
    expect(safeReturnUrl('//exemple.org')).toBe('/');
    expect(safeReturnUrl('/connexion')).toBe('/');
    expect(safeReturnUrl(null)).toBe('/');
  });
});
