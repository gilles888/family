import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MeDTO, provideApi } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { AuthService } from './auth.service';

const lea: MeDTO = { identifiant: 'lea', role: 'ENFANT', membreId: 4, membreNom: 'Léa', doitChangerMotDePasse: false };

describe('AuthService', () => {
  let auth: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideApi('')] });
    auth = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('demande /v1/auth/me une seule fois et retient l’utilisateur', async () => {
    const first = auth.ensureLoaded();
    const second = auth.ensureLoaded();
    const req = backend.expectOne('/v1/auth/me');
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    req.flush(lea);

    expect(await first).toEqual(lea);
    expect(await second).toEqual(lea);
    expect(auth.isChild()).toBe(true);
    expect(auth.isParent()).toBe(false);
    expect(auth.displayName()).toBe('Léa');
  });

  it('personne de connecté sur un 401', async () => {
    const loaded = auth.ensureLoaded();
    backend.expectOne('/v1/auth/me').flush({ code: 'NON_CONNECTE' }, { status: 401, statusText: 'Unauthorized' });

    expect(await loaded).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('connexion : envoie « rester connecté » et retient l’utilisateur', () => {
    auth.login('lea', 'mot-de-passe-1', true).subscribe();
    const req = backend.expectOne('/v1/auth/login');
    expect(req.request.body).toEqual({ identifiant: 'lea', motDePasse: 'mot-de-passe-1', resterConnecte: true });
    req.flush({ ...lea, doitChangerMotDePasse: true });

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.mustChangePassword()).toBe(true);
  });

  it('changement de mot de passe : l’utilisateur n’a plus à le changer', () => {
    auth.login('lea', 'mot-de-passe-1', false).subscribe();
    backend.expectOne('/v1/auth/login').flush({ ...lea, doitChangerMotDePasse: true });

    auth.changePassword('mot-de-passe-1', 'nouveau-mdp-2').subscribe();
    const req = backend.expectOne('/v1/auth/password');
    expect(req.request.body).toEqual({ ancienMotDePasse: 'mot-de-passe-1', nouveauMotDePasse: 'nouveau-mdp-2' });
    req.flush(lea);

    expect(auth.mustChangePassword()).toBe(false);
  });

  it('déconnexion : l’utilisateur est oublié, même si le serveur répond en erreur', async () => {
    auth.login('lea', 'mot-de-passe-1', false).subscribe();
    backend.expectOne('/v1/auth/login').flush(lea);

    auth.logout().subscribe({ error: () => undefined });
    backend.expectOne('/v1/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(await auth.ensureLoaded()).toBeNull();
  });
});
