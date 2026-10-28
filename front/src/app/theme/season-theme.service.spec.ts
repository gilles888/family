import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FamilyMemberDTO, MeDTO, ThemeSettingsDTO, provideApi } from '../api-client';
import { provideFakeAuth } from '../auth/testing';
import { SeasonThemeService } from './season-theme.service';

const alice: FamilyMemberDTO = { id: 4, nom: 'Alice', couleur: '#e91e63', dateNaissance: '2017-10-12' };
const AUTO: ThemeSettingsDTO = { mode: 'AUTO', anniversairesActifs: true, enfantsPeuventChoisir: false };

function demarrer(role: MeDTO.RoleEnum | null, aujourdhui: string, reglage: ThemeSettingsDTO = AUTO, membres = [alice]) {
  const [y, m, d] = aujourdhui.split('-').map(Number);
  vi.useFakeTimers({ now: new Date(y, m - 1, d, 10), toFake: ['Date'] });
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(''), provideFakeAuth(role)] });
  const service = TestBed.inject(SeasonThemeService);
  const backend = TestBed.inject(HttpTestingController);
  TestBed.tick();
  if (role) {
    backend.expectOne('/v1/parametres/theme').flush(reglage);
    backend.expectOne('/v1/membres').flush(membres);
  } else {
    backend.expectNone('/v1/parametres/theme');
  }
  TestBed.tick();
  return { service, backend };
}

describe('SeasonThemeService', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    delete document.documentElement.dataset['season'];
    delete document.documentElement.dataset['seasonPhase'];
  });

  it('automatique : le thème de la date, posé sur <html>', () => {
    const { service } = demarrer('PARENT', '2026-10-20');
    expect(service.actif()).toMatchObject({ id: 'halloween', phase: 'approche' });
    expect(document.documentElement.dataset['season']).toBe('halloween');
    expect(document.documentElement.dataset['seasonPhase']).toBe('approche');
  });

  it('saison de fond : pas de phase', () => {
    demarrer('PARENT', '2026-11-10');
    expect(document.documentElement.dataset['season']).toBe('automne');
    expect(document.documentElement.dataset['seasonPhase']).toBeUndefined();
  });

  it('le jour d’un anniversaire, le membre est fêté', () => {
    const { service } = demarrer('ENFANT', '2026-10-12');
    expect(service.actif()).toMatchObject({ id: 'anniversaire', phase: 'jourJ', membres: [alice] });
  });

  it('anniversaires désactivés : ignorés', () => {
    const { service } = demarrer('PARENT', '2026-10-12', { ...AUTO, anniversairesActifs: false });
    expect(service.actif().id).toBe('halloween');
  });

  it('page de connexion : calcul automatique, sans anniversaires, sans appel', () => {
    const { service } = demarrer(null, '2026-10-12');
    expect(service.actif().id).toBe('halloween');
  });

  it('thème forcé par la famille : il passe avant la date et la préférence de l’appareil', () => {
    localStorage.setItem('famille.theme', 'hiver');
    const { service } = demarrer('PARENT', '2026-10-20', { ...AUTO, mode: 'FORCE', theme: 'NOEL', jusqua: '2026-12-31' });
    expect(service.actif()).toMatchObject({ id: 'noel', phase: 'jourJ' });
  });

  it('thème forcé sans date de fin', () => {
    const { service } = demarrer('ENFANT', '2026-10-20', { ...AUTO, mode: 'FORCE', theme: 'SAINT_NICOLAS' });
    expect(service.actif().id).toBe('saint-nicolas');
  });

  it('anniversaire forcé : avec le membre choisi', () => {
    const { service } = demarrer('ENFANT', '2026-04-01', { ...AUTO, mode: 'FORCE', theme: 'ANNIVERSAIRE', membreId: 4 });
    expect(service.actif()).toMatchObject({ id: 'anniversaire', membres: [alice] });
  });

  it('désactivé : thème neutre, même avec une préférence d’appareil', () => {
    localStorage.setItem('famille.theme', 'hiver');
    const { service } = demarrer('PARENT', '2026-10-20', { ...AUTO, mode: 'OFF', enfantsPeuventChoisir: true });
    expect(service.actif().id).toBe('neutre');
  });

  it('un parent choisit un thème pour son appareil', () => {
    const { service } = demarrer('PARENT', '2026-10-20');
    service.choisirPourAppareil('printemps');
    TestBed.tick();
    expect(service.actif().id).toBe('printemps');
    expect(localStorage.getItem('famille.theme')).toBe('printemps');
    service.choisirPourAppareil(null);
    expect(service.actif().id).toBe('halloween');
    expect(localStorage.getItem('famille.theme')).toBeNull();
  });

  it('enfant : la préférence compte seulement si la famille l’autorise', () => {
    localStorage.setItem('famille.theme', 'ete');
    expect(demarrer('ENFANT', '2026-10-20').service.actif().id).toBe('halloween');
  });

  it('enfant autorisé à choisir : sa préférence s’applique', () => {
    localStorage.setItem('famille.theme', 'ete');
    const { service } = demarrer('ENFANT', '2026-10-20', { ...AUTO, enfantsPeuventChoisir: true });
    expect(service.choixAppareilPossible()).toBe(true);
    expect(service.actif().id).toBe('ete');
  });

  it('préférence inconnue dans le stockage : ignorée', () => {
    localStorage.setItem('famille.theme', 'nimporte-quoi');
    expect(demarrer('PARENT', '2026-10-20').service.actif().id).toBe('halloween');
  });

  it('l’aperçu passe avant tout et s’annule', () => {
    const { service } = demarrer('PARENT', '2026-10-20');
    service.previsualiser('paques');
    expect(service.actif().id).toBe('paques');
    service.previsualiser(null);
    expect(service.actif().id).toBe('halloween');
  });

  it('un changement du parent arrive au retour au premier plan', () => {
    const { service, backend } = demarrer('ENFANT', '2026-10-20');
    expect(service.actif().id).toBe('halloween');

    document.dispatchEvent(new Event('visibilitychange'));
    backend.expectOne('/v1/parametres/theme').flush({ ...AUTO, mode: 'FORCE', theme: 'CARNAVAL' });
    backend.expectOne('/v1/membres').flush([alice]);
    TestBed.tick();
    expect(service.actif().id).toBe('carnaval');
  });
});
