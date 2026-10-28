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
