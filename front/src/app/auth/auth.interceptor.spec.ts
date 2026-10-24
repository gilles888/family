import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { apiErrorInterceptor } from '../shared/api-error.interceptor';
import { NotificationService } from '../shared/notification.service';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;
  let auth: { clear: ReturnType<typeof vi.fn>; requirePasswordChange: ReturnType<typeof vi.fn> };
  let errors: string[];

  beforeEach(() => {
    errors = [];
    navigate = vi.fn(() => Promise.resolve(true));
    auth = { clear: vi.fn(), requirePasswordChange: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { url: '/recettes', navigate } },
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: { error: (m: string) => errors.push(m) } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  function fail(url: string, status: number, body: object | null = null): void {
    http.get(url).subscribe({ error: () => undefined });
    backend.expectOne(url).flush(body, { status, statusText: 'Erreur' });
  }

  it('401 : utilisateur oublié, page de connexion puis retour à la page en cours, sans message', () => {
    fail('/v1/membres', 401, { code: 'NON_CONNECTE' });

    expect(auth.clear).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/connexion'], { queryParams: { retour: '/recettes' } });
    expect(errors).toEqual([]);
  });

  it('401 de /v1/auth/me ou de la connexion : géré par l’appelant', () => {
    fail('/v1/auth/me', 401);
    fail('/v1/auth/login', 401);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('403 « mot de passe à changer » : page de changement de mot de passe, sans message', () => {
    fail('/v1/membres', 403, { code: 'MOT_DE_PASSE_A_CHANGER' });

    expect(auth.requirePasswordChange).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/mot-de-passe']);
    expect(errors).toEqual([]);
  });

  it('autre 403 : « Action non autorisée »', () => {
    fail('/v1/membres', 403, { code: 'ACTION_NON_AUTORISEE' });

    expect(navigate).not.toHaveBeenCalled();
    expect(errors).toEqual(['Action non autorisée.']);
  });
});
