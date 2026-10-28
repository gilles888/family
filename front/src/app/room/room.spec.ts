import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RedirectCommand, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FamilyMemberDTO, MembresService, MeDTO, provideApi } from '../api-client';
import { provideFakeAuth } from '../auth/testing';
import { defaultAvatar } from '../avatar/avatar-config';
import { ALL_STATIC, FURNITURE_RECT, ROOM_H, ROOM_W } from './room-art';
import { roomMemberResolver } from './room-member.resolver';
import { RoomScene, SPOT_LABELS } from './room-scene';

const MEMBER: FamilyMemberDTO = { id: 4, nom: 'Léa', couleur: '#E91E63' };

describe('chambre : dessin', () => {
  it('tous les meubles tiennent dans la pièce et ont un libellé', () => {
    for (const [name, [x, y, w, h]] of Object.entries(FURNITURE_RECT)) {
      expect(x >= 0 && y >= 0 && x + w <= ROOM_W && y + h <= ROOM_H, name).toBe(true);
      expect(SPOT_LABELS[name as keyof typeof SPOT_LABELS], name).toBeTruthy();
    }
  });

  it('chaque groupe de formes est dessiné', () => {
    for (const shapes of ALL_STATIC) {
      expect(shapes.length).toBeGreaterThan(0);
    }
  });
});

describe('chambre : scène', () => {
  function render(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideApi('')] });
    const ref = TestBed.createComponent(RoomScene).componentRef;
    ref.setInput('config', defaultAvatar(4));
    ref.setInput('member', MEMBER);
    for (const [k, v] of Object.entries(inputs)) ref.setInput(k, v);
    ref.changeDetectorRef.detectChanges();
    return ref.location.nativeElement as HTMLElement;
  }

  it('chaque meuble est un vrai bouton avec son libellé', () => {
    const el = render();
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('button.spot')];
    expect(buttons).toHaveLength(Object.keys(FURNITURE_RECT).length);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toContain('Armoire : tenues et déguisements');
    expect(buttons.every((b) => b.getAttribute('type') === 'button')).toBe(true);
  });

  it('un clic sur un meuble le signale ; le meuble ouvert est marqué', () => {
    const el = render({ open: 'armoire' });
    const armoire = el.querySelector<HTMLButtonElement>('button[aria-label^="Armoire"]')!;
    expect(armoire.getAttribute('aria-expanded')).toBe('true');
    expect(armoire.classList.contains('active')).toBe(true);
    expect(el.querySelector('.door-left')?.classList.contains('open')).toBe(true);
    expect(el.querySelector('button[aria-label^="Commode"]')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('meuble vide : grisé', () => {
    const el = render({ emptyFurniture: { coffre: true } });
    const coffre = el.querySelector('button[aria-label^="Coffre"]')!;
    expect(coffre.classList.contains('empty')).toBe(true);
    expect(coffre.getAttribute('aria-disabled')).toBe('true');
  });

  it('le ciel de la fenêtre suit le fond du personnage (couleur, puis dégradé)', () => {
    let el = render({ config: { ...defaultAvatar(4), background: '#bbf7d0' } });
    expect(el.querySelector('svg.art > rect')?.getAttribute('fill')).toBe('#bbf7d0');
    TestBed.resetTestingModule();
    el = render({ config: { ...defaultAvatar(4), background: 'bg-ocean' } });
    expect(el.querySelector('svg.art > rect')?.getAttribute('fill')).toBe('url(#room-sky)');
    expect(el.querySelector('linearGradient#room-sky')).not.toBeNull();
  });

  it('le personnage est dessiné sans fond', () => {
    const el = render();
    expect(el.querySelector('app-avatar [data-layer="background"]')).toBeNull();
    expect(el.querySelector('app-avatar [data-layer="body"]')).not.toBeNull();
  });
});

describe('chambre : accès', () => {
  function resolve(role: MeDTO.RoleEnum, id: string, member: FamilyMemberDTO = MEMBER) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideFakeAuth(role, { membreId: 4 }),
        { provide: MembresService, useValue: { getMembre: () => of(member) } },
      ],
    });
    const route = { paramMap: convertToParamMap({ memberId: id }) } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => roomMemberResolver(route, {} as never)) as Promise<FamilyMemberDTO | RedirectCommand>;
  }

  it('un parent ouvre n’importe quelle chambre', async () => {
    expect(await resolve('PARENT', '9', { id: 9, nom: 'Tom', couleur: '#4CAF50' })).toMatchObject({ id: 9 });
  });

  it('un enfant ouvre la sienne, pas celle d’un autre', async () => {
    expect(await resolve('ENFANT', '4')).toMatchObject({ id: 4 });
    TestBed.resetTestingModule();
    const other = await resolve('ENFANT', '9');
    expect(other).toBeInstanceOf(RedirectCommand);
    expect(TestBed.inject(Router).serializeUrl((other as RedirectCommand).redirectTo as never)).toBe('/');
  });

  it('identifiant invalide : retour à l’accueil', async () => {
    expect(await resolve('PARENT', 'abc')).toBeInstanceOf(RedirectCommand);
  });
});

describe('chambre : meubles ouverts', () => {
  async function render(role: MeDTO.RoleEnum = 'ENFANT', pieces = 6) {
    const { RoomView } = await import('./room-view');
    const { HttpTestingController } = await import('@angular/common/http/testing');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(''),
        provideRouter([]),
        provideFakeAuth(role, { membreId: 4 }),
        { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { data: { member: MEMBER } } } },
      ],
    });
    const fixture = TestBed.createComponent(RoomView);
    const backend = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    backend.expectOne('/v1/membres/4/porte-monnaie').flush({ etoilesDisponibles: 0, pieces, etoilesParPiece: 10, etoilesConverties: 0 });
    backend.expectOne('/v1/membres/4/articles').flush([]);
    backend.expectOne('/v1/boutique/catalogue').flush([{ id: 'costume-witch', emplacement: 'costume', prix: 5, rarete: 'super', theme: 'HALLOWEEN' }]);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  const el = (f: { nativeElement: HTMLElement }) => f.nativeElement;
  const spot = (f: { nativeElement: HTMLElement }, label: string) => el(f).querySelector<HTMLButtonElement>(`button.spot[aria-label^="${label}"]`)!;

  it('un appui ouvre le meuble et montre ses affaires ; un seul meuble à la fois', async () => {
    const fixture = await render();
    spot(fixture, 'Armoire').click();
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll('app-furniture-panel')).toHaveLength(1);
    expect(el(fixture).querySelector('app-furniture-panel')?.getAttribute('aria-label')).toContain('Armoire');
    expect(el(fixture).querySelectorAll('app-furniture-panel app-room-item').length).toBeGreaterThan(10);
    expect(el(fixture).querySelector('.door-left')?.classList.contains('open')).toBe(true);

    spot(fixture, 'Coffre').click();
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll('app-furniture-panel')).toHaveLength(1);
    expect(el(fixture).querySelector('app-furniture-panel')?.getAttribute('aria-label')).toContain('Coffre');
    expect(el(fixture).querySelector('.door-left')?.classList.contains('open')).toBe(false);
  });

  it('Échap et ✕ referment le meuble', async () => {
    const fixture = await render();
    spot(fixture, 'Commode').click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el(fixture).querySelector('app-furniture-panel')).toBeNull();

    spot(fixture, 'Armoire').click();
    fixture.detectChanges();
    el(fixture).querySelector<HTMLButtonElement>('app-furniture-panel .close')!.click();
    fixture.detectChanges();
    expect(el(fixture).querySelector('app-furniture-panel')).toBeNull();
  });

  it('enfiler une affaire : le personnage la porte ; un article payant porte son prix et un cadenas', async () => {
    const fixture = await render();
    spot(fixture, 'Étagère').click();
    fixture.detectChanges();
    el(fixture).querySelector<HTMLButtonElement>('app-furniture-panel button.item[aria-label="Couronne"]')!.click();
    fixture.detectChanges();
    expect(el(fixture).querySelector('app-room-scene [data-layer="hat"]')?.getAttribute('data-part')).toBe('hat-crown');

    spot(fixture, 'Étagère').click();
    spot(fixture, 'Armoire').click();
    fixture.detectChanges();
    const sorciere = el(fixture).querySelector('app-furniture-panel button.item[aria-label="Sorcière"]')!;
    expect(sorciere.textContent).toContain('🪙 5');
    expect(sorciere.querySelector('.lock')).not.toBeNull();
    sorciere.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(el(fixture).querySelector('button.save')?.textContent).toContain('Acheter pour 5 🪙');
  });

  it('le dé signale « Surprise ! » : le personnage change', async () => {
    const fixture = await render();
    const avant = el(fixture).querySelector('app-room-scene app-avatar')!.innerHTML;
    spot(fixture, 'Surprise').click();
    fixture.detectChanges();
    expect(el(fixture).querySelector('app-room-scene app-avatar')!.innerHTML).not.toBe(avant);
  });

  it('boutique : seulement ce qui s’achète, sans « aucun »', async () => {
    const fixture = await render();
    spot(fixture, 'Boutique').click();
    fixture.detectChanges();
    const items = [...el(fixture).querySelectorAll('app-furniture-panel button.item')];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.querySelector('.lock'))).toBe(true);
    expect(el(fixture).querySelector('app-furniture-panel .no')).toBeNull();
  });

  it('une pièce portée se retire avec « Enlever… »', async () => {
    const fixture = await render();
    spot(fixture, 'Étagère').click();
    fixture.detectChanges();
    el(fixture).querySelector<HTMLButtonElement>('app-furniture-panel button.item[aria-label="Couronne"]')!.click();
    fixture.detectChanges();
    el(fixture).querySelector<HTMLButtonElement>('.worn-button')!.click();
    fixture.detectChanges();
    el(fixture).querySelector<HTMLButtonElement>('.worn-menu button')!.click();
    fixture.detectChanges();
    expect(el(fixture).querySelector('app-room-scene [data-layer="hat"]')).toBeNull();
  });

  it('parent : « Offrir et enregistrer » à la place de l’achat', async () => {
    const fixture = await render('PARENT', 0);
    spot(fixture, 'Armoire').click();
    fixture.detectChanges();
    el(fixture).querySelector<HTMLButtonElement>('app-furniture-panel button.item[aria-label="Sorcière"]')!.click();
    fixture.detectChanges();
    expect(el(fixture).querySelector('button.save')?.textContent).toContain('Offrir et enregistrer');
  });
});
