import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ArticleDTO, FamilyMemberDTO, MeDTO, PorteMonnaieDTO, provideApi } from '../api-client';
import { provideFakeAuth } from '../auth/testing';
import { ActiveTheme } from '../theme/active-theme';
import { AvatarDressingStore, DRESSING_MEMBER, DressingReaction } from './avatar-dressing-store';
import { WARDROBE } from './avatar-wardrobe';

const CATALOGUE: ArticleDTO[] = [
  { id: 'costume-witch', emplacement: 'costume', prix: 5, rarete: 'super', theme: 'HALLOWEEN' },
  { id: 'held-broom', emplacement: 'held', prix: 1, rarete: 'commun', theme: 'HALLOWEEN' },
];
const wallet = (pieces: number): PorteMonnaieDTO => ({ etoilesDisponibles: 3, pieces, etoilesParPiece: 10, etoilesConverties: 0 });
const MEMBER: FamilyMemberDTO = { id: 3, nom: 'Léa', couleur: '#E91E63', tenueAuto: true, tenues: { NOEL: { version: 2, hat: 'hat-crown' } } };

const option = (key: string) => WARDROBE.flatMap((c) => c.groups).flatMap((g) => g.options).find((o) => o.key === key)!;

describe('AvatarDressingStore', () => {
  let backend: HttpTestingController;

  function start(role: MeDTO.RoleEnum, pieces: number) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(''),
        provideFakeAuth(role),
        { provide: DRESSING_MEMBER, useValue: MEMBER },
        AvatarDressingStore,
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(AvatarDressingStore);
    backend.expectOne('/v1/membres/3/porte-monnaie').flush(wallet(pieces));
    backend.expectOne('/v1/membres/3/articles').flush([]);
    backend.expectOne('/v1/boutique/catalogue').flush(CATALOGUE);
    return store;
  }

  afterEach(() => backend.verify());

  it('pose une pièce et le signale (pop) ; retire le chapeau porté', () => {
    const store = start('ENFANT', 0);
    const reactions: DressingReaction[] = [];
    store.reactions.subscribe((r) => reactions.push(r));

    store.wear(option('hat:hat-crown'));
    expect(store.config().hat).toBe('hat-crown');
    expect(store.worn().map((w) => w.field)).toEqual(['hat']);
    store.remove('hat');
    expect(store.config().hat).toBe('none');
    expect(store.worn()).toEqual([]);
    expect(reactions).toEqual(['pop', 'pop']);
  });

  it('« Surprise ! » change le personnage avec des pièces gratuites et le signale', () => {
    const store = start('ENFANT', 0);
    const reactions: DressingReaction[] = [];
    store.reactions.subscribe((r) => reactions.push(r));
    store.surprise();
    expect(reactions).toEqual(['surprise']);
    expect(store.missing()).toEqual([]);
  });

  it('essayer un article payant : manquant, total et pièces qui manquent', () => {
    const store = start('ENFANT', 3);
    store.wear(option('costume:costume-witch'));
    store.wear(option('held:held-broom'));
    expect(store.missing()).toEqual(['costume-witch', 'held-broom']);
    expect(store.totalPrice()).toBe(6);
    expect(store.lacking()).toBe(3);
    expect(store.saveIcon()).toBe('lock');
  });

  it('assez de pièces : icône d’achat ; parent : icône de cadeau', () => {
    const enfant = start('ENFANT', 6);
    enfant.wear(option('costume:costume-witch'));
    expect(enfant.lacking()).toBe(0);
    expect(enfant.saveIcon()).toBe('shopping_cart');
  });

  it('parent : les articles essayés sont offerts puis le personnage est enregistré', () => {
    const store = start('PARENT', 0);
    store.wear(option('costume:costume-witch'));
    expect(store.saveIcon()).toBe('card_giftcard');
    let saved: FamilyMemberDTO | undefined;
    store.saveOrBuy(() => of(false)).subscribe((m) => (saved = m));
    backend.expectOne({ method: 'POST', url: '/v1/membres/3/boutique/cadeaux' }).flush(wallet(0));
    const put = backend.expectOne({ method: 'PUT', url: '/v1/membres/3/avatar' });
    expect(put.request.body.costume).toBe('costume-witch');
    put.flush({ id: 3, nom: 'Léa', couleur: '#E91E63' });
    expect(saved?.tenues).toEqual(MEMBER.tenues);
    expect(store.saving()).toBe(true);
  });

  it('enfant : confirmation d’achat, puis enregistrement seulement si l’achat est fait', () => {
    const store = start('ENFANT', 6);
    store.wear(option('costume:costume-witch'));
    let saved = false;
    let asked: string[] = [];
    store.saveOrBuy((ids) => {
      asked = ids;
      return of(true);
    }).subscribe(() => (saved = true));
    expect(asked).toEqual(['costume-witch']);
    backend.expectOne({ method: 'PUT', url: '/v1/membres/3/avatar' }).flush({ id: 3, nom: 'Léa', couleur: '#E91E63' });
    expect(saved).toBe(true);
  });

  it('enfant qui refuse l’achat, ou qui n’a pas assez de pièces : rien n’est enregistré', () => {
    const store = start('ENFANT', 6);
    store.wear(option('costume:costume-witch'));
    let emitted = 0;
    store.saveOrBuy(() => of(false)).subscribe(() => emitted++);
    expect(emitted).toBe(0);
    // plus assez de pièces : la confirmation n'est même pas demandée
    store.shop.wallet.set(wallet(0));
    let asked = false;
    store.saveOrBuy(() => {
      asked = true;
      return of(true);
    }).subscribe(() => emitted++);
    expect(asked).toBe(false);
    expect(emitted).toBe(0);
  });

  it('sans article manquant : enregistre directement', () => {
    const store = start('ENFANT', 0);
    store.wear(option('hat:hat-crown'));
    let saved = false;
    store.saveOrBuy(() => of(false)).subscribe(() => (saved = true));
    backend.expectOne({ method: 'PUT', url: '/v1/membres/3/avatar' }).flush({ id: 3, nom: 'Léa', couleur: '#E91E63' });
    expect(saved).toBe(true);
  });

  it('filtres : « à moi » cache les articles à acheter, « Spécial thème » ne garde que le thème du moment', () => {
    const store = start('ENFANT', 0);
    TestBed.inject(ActiveTheme).id.set('halloween');
    const costumes = WARDROBE.find((c) => c.id === 'costume')!;
    const keys = () => store.groupsOf(costumes).flatMap((g) => g.options.filter((o) => !o.none).map((o) => o.articleId));

    store.filter.set('all');
    expect(keys()).toContain('costume-witch');
    expect(keys()[0]).toBe('costume-witch'); // pièces du thème d'abord
    store.filter.set('mine');
    expect(keys()).not.toContain('costume-witch');
    expect(keys()).toContain('costume-pyjama');
    store.filter.set('shop');
    expect(keys()).toContain('costume-witch');
    expect(keys()).not.toContain('costume-pyjama');
    store.filter.set('theme');
    expect(keys().every((id) => ['costume-witch', 'costume-ghost', 'costume-skeleton', 'costume-pumpkin', 'costume-vampire'].includes(id!))).toBe(true);
  });

  it('idées de thème : prix de ce qui manque ; aucune hors thème', () => {
    const store = start('ENFANT', 0);
    expect(store.ideas()).toEqual([]);
    TestBed.inject(ActiveTheme).id.set('halloween');
    const idea = store.ideas()[0];
    expect(idea.price).toBeGreaterThan(0);
    store.applyIdea(idea.idea);
    expect(store.config().costume).toBe('costume-witch');
  });

  it('tenues de thème : enregistrer, essayer, supprimer, port automatique', () => {
    const store = start('ENFANT', 0);
    expect(store.memberIfOutfitsChanged()).toBeUndefined();
    store.outfitTheme.set('noel');
    expect(store.savedConfig()?.hat).toBe('hat-crown');

    store.outfitTheme.set('halloween');
    store.wear(option('hat:hat-cap'));
    store.saveOutfit();
    const put = backend.expectOne({ method: 'PUT', url: '/v1/membres/3/tenues/HALLOWEEN' });
    expect(put.request.body.hat).toBe('hat-cap');
    put.flush({ HALLOWEEN: { version: 2, hat: 'hat-cap' } });
    expect(store.savedOutfit()).toEqual({ version: 2, hat: 'hat-cap' });

    store.remove('hat');
    store.tryOutfit();
    expect(store.config().hat).toBe('hat-cap');

    store.setOutfitAuto(false);
    backend.expectOne({ method: 'PUT', url: '/v1/membres/3/tenues/auto' }).flush(null);
    expect(store.memberIfOutfitsChanged()).toMatchObject({ tenueAuto: false, tenues: { HALLOWEEN: { hat: 'hat-cap' } } });

    store.removeOutfit();
    backend.expectOne({ method: 'DELETE', url: '/v1/membres/3/tenues/HALLOWEEN' }).flush({});
    expect(store.savedOutfit()).toBeNull();
  });
});
