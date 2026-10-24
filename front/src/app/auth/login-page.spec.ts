import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MeDTO } from '../api-client';
import { AuthService } from './auth.service';
import { LoginPage, loginErrorMessage } from './login-page';

const unauthorized = (body: object) => new HttpErrorResponse({ status: 401, error: body });

async function render(login: ReturnType<typeof vi.fn>, retour: string | null = '/routines') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { login } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(retour ? { retour } : {}) } } },
    ],
  });
  const router = TestBed.inject(Router);
  const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LoginPage);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;

  async function submit(identifiant: string, motDePasse: string, resterConnecte = false) {
    const set = (selector: string, value: string) => {
      const input = el.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('input[autocomplete="username"]', identifiant);
    set('input[autocomplete="current-password"]', motDePasse);
    if (resterConnecte) {
      (el.querySelector('mat-checkbox input') as HTMLInputElement).click();
    }
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  return { el, submit, navigateByUrl };
}

describe('LoginPage', () => {
  it('se connecte puis revient à la page demandée', async () => {
    const login = vi.fn(() => of<MeDTO>({ identifiant: 'lea', role: 'ENFANT' }));
    const { submit, navigateByUrl } = await render(login);

    await submit(' lea ', 'mot-de-passe-1', true);

    expect(login).toHaveBeenCalledWith('lea', 'mot-de-passe-1', true);
    expect(navigateByUrl).toHaveBeenCalledWith('/routines');
  });

  it('mot de passe à changer : page de changement de mot de passe', async () => {
    const login = vi.fn(() => of<MeDTO>({ identifiant: 'lea', role: 'ENFANT', doitChangerMotDePasse: true }));
    const { submit, navigateByUrl } = await render(login);

    await submit('lea', 'mot-de-passe-1');

    expect(navigateByUrl).toHaveBeenCalledWith('/mot-de-passe');
  });

  it('identifiants refusés : message, sans navigation', async () => {
    const login = vi.fn(() => throwError(() => unauthorized({ code: 'IDENTIFIANTS_INVALIDES' })));
    const { el, submit, navigateByUrl } = await render(login);

    await submit('lea', 'mauvais');

    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Identifiant ou mot de passe incorrect');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('compte bloqué : affiche l’heure de déblocage', async () => {
    const login = vi.fn(() => throwError(() => unauthorized({ code: 'COMPTE_BLOQUE', bloqueJusqua: '2026-09-21T10:15:00' })));
    const { el, submit } = await render(login);

    await submit('lea', 'mauvais');

    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Trop de tentatives');
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('10:15');
  });

  it('messages des autres refus', () => {
    expect(loginErrorMessage(unauthorized({ code: 'COMPTE_DESACTIVE' }), 'fr')).toContain('désactivé');
    expect(loginErrorMessage(new HttpErrorResponse({ status: 0 }), 'fr')).toContain('Impossible de joindre le serveur');
    expect(loginErrorMessage(new HttpErrorResponse({ status: 403, error: { code: 'CSRF_INVALIDE' } }), 'fr')).toContain('expiré');
  });
});
