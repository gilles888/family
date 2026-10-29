import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AVATAR_VERSION,
  AvatarConfig,
  DEFAULT_EYE_COLOR,
  defaultAvatar,
  normalizeAvatar,
  randomAvatar,
} from './avatar-config';
import { PARTS_BY_SLOT } from './avatar-parts';
import { ANCHORS, BODY_FRAME, BODY_H, BODY_W, BUST_FRAME, HEAD_FRAME, HEAD_TRANSFORM } from './avatar-body';
import { ZONES } from './avatar-parts';
import { LAYER_ORDER } from './avatar-layers';
import { Avatar } from './avatar';

const CONFIG: AvatarConfig = {
  version: 1,
  skin: 'skin-3',
  eyes: 'eyes-happy',
  mouth: 'mouth-smile',
  hair: 'hair-long',
  hairColor: '#6b3e26',
  outfit: 'outfit-hoodie',
  outfitColor: '#3b82f6',
  hat: 'hat-crown',
  accessory: 'none',
  background: '#fde68a',
};

describe('Avatar v2 : déguisements, visage, dos, objets', () => {
  const render = (config: AvatarConfig, extra: Record<string, unknown> = {}) => {
    const ref = TestBed.createComponent(Avatar).componentRef;
    ref.setInput('config', config);
    for (const [k, v] of Object.entries(extra)) ref.setInput(k, v);
    ref.changeDetectorRef.detectChanges();
    return ref.location.nativeElement as HTMLElement;
  };
  const layers = (el: HTMLElement) =>
    [...el.querySelectorAll('[data-layer]')].map((g) => g.getAttribute('data-layer'));
  const part = (el: HTMLElement, layer: string) =>
    el.querySelector(`g[data-layer="${layer}"]`)?.getAttribute('data-part');

  it('ancienne config (version 1) : acceptée, nouveaux emplacements à « none », version mise à jour', () => {
    const config = normalizeAvatar(CONFIG, defaultAvatar(1));
    expect(config.version).toBe(AVATAR_VERSION);
    expect([config.costume, config.face, config.back, config.held]).toEqual([
      'none',
      'none',
      'none',
      'none',
    ]);
  });

  it('ids inconnus des nouveaux emplacements : remplacés par « none »', () => {
    const config = normalizeAvatar(
      { ...CONFIG, costume: 'costume-inconnu', held: 12, back: 'x" onload="y' },
      defaultAvatar(1),
    );
    expect([config.costume, config.back, config.held]).toEqual(['none', 'none', 'none']);
  });

  it('un déguisement remplace la tenue et cache les cheveux (sorcière : coiffe apportée, chapeau choisi caché)', () => {
    const el = render({ ...CONFIG, hat: 'hat-crown', costume: 'costume-witch' });
    expect(part(el, 'body')).toBe('costume-witch');
    expect(part(el, 'hat')).toBe('costume-witch');
  });

  it('déguisement qui cache les cheveux : plus de calques de cheveux', () => {
    const el = render({ ...CONFIG, costume: 'costume-ghost' });
    expect(layers(el)).not.toContain('hair-front');
    expect(layers(el)).not.toContain('hair-back');
  });

  it('déguisement sans coiffe : le chapeau choisi reste porté', () => {
    const el = render({ ...CONFIG, hat: 'hat-crown', costume: 'costume-hero' });
    expect(part(el, 'hat')).toBe('hat-crown');
  });

  it('ordre des calques : dos derrière le corps, objet tenu tout devant, visage sous les yeux', () => {
    const el = render({
      ...CONFIG,
      back: 'back-cape-plain',
      face: 'face-freckles',
      held: 'held-flower',
      accessory: 'acc-glasses',
    });
    const l = layers(el);
    expect(l.indexOf('back')).toBeLessThan(l.indexOf('body'));
    expect(l.indexOf('face')).toBeLessThan(l.indexOf('eyes'));
    expect(l.indexOf('face')).toBeGreaterThan(l.indexOf('body-front'));
    expect(l.at(-1)).toBe('held');
    expect(l.indexOf('held')).toBeGreaterThan(l.indexOf('accessory'));
    expect(l).toEqual(LAYER_ORDER.filter((x) => l.includes(x)));
  });

  it('le ballon prend la couleur du membre', () => {
    const el = render(
      { ...CONFIG, held: 'held-balloon' },
      { member: { id: 1, nom: 'Léa', couleur: '#e91e63' } },
    );
    expect(el.querySelector('g[data-layer="held"] ellipse')?.getAttribute('fill')).toBe('#e91e63');
  });

  it('« Surprise » et l’avatar par défaut ne tirent que des pièces gratuites', () => {
    const free = (slot: keyof typeof PARTS_BY_SLOT, id: string) =>
      PARTS_BY_SLOT[slot].find((p) => p.id === id)?.free === true;
    for (let i = 0; i < 40; i++) {
      const a = randomAvatar();
      expect(
        free('hair', a.hair) &&
          free('hat', a.hat) &&
          free('body', a.outfit) &&
          free('accessory', a.accessory),
      ).toBe(true);
    }
  });
});

describe('Avatar', () => {
  let ref: ComponentRef<Avatar>;
  let el: HTMLElement;

  function render(inputs: Record<string, unknown>): void {
    ref = TestBed.createComponent(Avatar).componentRef;
    for (const [name, value] of Object.entries(inputs)) {
      ref.setInput(name, value);
    }
    ref.changeDetectorRef.detectChanges();
    el = ref.location.nativeElement;
  }

  const layers = () =>
    [...el.querySelectorAll('[data-layer]')].map((g) => g.getAttribute('data-layer'));
  const part = (layer: string) =>
    el.querySelector(`g[data-layer="${layer}"]`)?.getAttribute('data-part');

  it('dessine les calques de la config dans l’ordre, du fond vers l’avant', () => {
    render({ config: CONFIG, size: 120 });

    expect(layers()).toEqual([
      'background',
      'body',
      'hair-back',
      'head',
      'body-front',
      'eyes',
      'mouth',
      'hair-front',
      'hat',
    ]);
    expect(layers()).toEqual(LAYER_ORDER.filter((l) => layers().includes(l)));
    expect(part('hat')).toBe('hat-crown');
    expect(part('eyes')).toBe('eyes-happy');
    expect(el.style.width).toBe('120px');
  });

  it('applique les couleurs choisies : fond, cheveux, habit, teint', () => {
    render({ config: CONFIG });

    expect(el.querySelector('[data-layer="background"]')?.getAttribute('fill')).toBe('#fde68a');
    expect(el.querySelector('g[data-layer="hair-front"] path')?.getAttribute('fill')).toBe(
      '#6b3e26',
    );
    expect(el.querySelector('g[data-layer="body"] [fill="#3b82f6"]')).not.toBeNull();
    expect(el.querySelector('g[data-layer="head"] ellipse')?.getAttribute('fill')).toBe('#e0ac69');
  });

  it('« aucun » chapeau ni accessoire : pas de calque', () => {
    render({ config: { ...CONFIG, hat: 'none' } });

    expect(layers()).not.toContain('hat');
    expect(layers()).not.toContain('accessory');
  });

  it('membre sans avatar : avatar par défaut, toujours le même pour un même id', () => {
    render({ member: { id: 7, nom: 'Léa', couleur: '#E91E63' }, label: 'Léa' });
    // les ids des dégradés d'ombrage sont propres à chaque SVG
    const html = () => el.innerHTML.replace(/avatar-[a-z-]+-\d+/g, 'avatar-x');
    const first = html();
    render({ member: { id: 7, nom: 'Léa', couleur: '#E91E63' }, label: 'Léa' });

    expect(html()).toBe(first);
    expect(el.querySelector('svg')?.getAttribute('aria-label')).toBe('Léa');
    expect(layers()).not.toContain('hat');
  });

  it('valeurs inconnues ou mal formées : remplacées, jamais injectées', () => {
    const fallback = defaultAvatar(1);
    const config = normalizeAvatar(
      { ...CONFIG, hat: 'hat-supprime', hairColor: 'red" onload="x', background: 'url(evil)' },
      fallback,
    );

    expect(config.hat).toBe(fallback.hat);
    expect(config.hairColor).toBe(fallback.hairColor);
    expect(config.background).toBe(fallback.background);
    expect(config.eyes).toBe('eyes-happy');
  });

  describe('couleur des yeux', () => {
    const iris = () => el.querySelector('g[data-layer="eyes"] circle')?.getAttribute('fill');

    it('normalisation : couleur valide gardée, absente ou mal formée → noir', () => {
      const fallback = defaultAvatar(1);

      expect(normalizeAvatar({ ...CONFIG, eyeColor: '#1e88e5' }, fallback).eyeColor).toBe(
        '#1e88e5',
      );
      expect(normalizeAvatar(CONFIG, fallback).eyeColor).toBe(DEFAULT_EYE_COLOR);
      expect(normalizeAvatar({ ...CONFIG, eyeColor: 'blue' }, fallback).eyeColor).toBe(
        DEFAULT_EYE_COLOR,
      );
      expect(normalizeAvatar({ ...CONFIG, eyeColor: '#12" onload="x' }, fallback).eyeColor).toBe(
        DEFAULT_EYE_COLOR,
      );
      expect(normalizeAvatar(null, fallback).eyeColor).toBe(DEFAULT_EYE_COLOR);
    });

    it('rendu : l’iris prend la couleur des yeux, la pupille reste noire', () => {
      render({ config: { ...CONFIG, eyes: 'eyes-round', eyeColor: '#1e88e5' } });

      const fills = [...el.querySelectorAll('g[data-layer="eyes"] circle')].map((c) =>
        c.getAttribute('fill'),
      );
      expect(iris()).toBe('#1e88e5');
      expect(fills).toContain(DEFAULT_EYE_COLOR);
    });

    it('ancien avatar sans couleur des yeux : iris noir', () => {
      render({ config: normalizeAvatar({ ...CONFIG, eyes: 'eyes-round' }, defaultAvatar(1)) });

      expect(iris()).toBe(DEFAULT_EYE_COLOR);
    });
  });

  it('un avatar enregistré en version 2 reste valide : mêmes ids, version remise à jour', () => {
    const old = { ...CONFIG, version: 2, outfit: 'outfit-hoodie', costume: 'costume-witch' };
    const config = normalizeAvatar(old, defaultAvatar(1));
    expect(config.version).toBe(AVATAR_VERSION);
    expect(config.outfit).toBe('outfit-hoodie');
    expect(config.costume).toBe('costume-witch');
  });

  describe('le corps unique', () => {
    it('buste et tête sont des recadrages du même corps entier', () => {
      render({ config: CONFIG, size: 100 });
      expect(el.querySelector('svg')?.getAttribute('viewBox')).toBe(BUST_FRAME);
      render({ config: CONFIG, size: 30 });
      expect(el.querySelector('svg')?.getAttribute('viewBox')).toBe(HEAD_FRAME);
      render({ config: CONFIG, size: 100, full: true });
      expect(el.querySelector('svg')?.getAttribute('viewBox')).toBe(BODY_FRAME);
      // le dessin est le même : mêmes calques dans les trois cas
      expect(layers()).toContain('body');
    });

    it('les calques de tête sont posés sur le corps, le corps est dessiné tel quel', () => {
      render({ config: CONFIG });
      expect(el.querySelector('g[data-layer="head"]')?.getAttribute('transform')).toBe(HEAD_TRANSFORM);
      expect(el.querySelector('g[data-layer="body"]')?.getAttribute('transform')).toBeNull();
    });

    it('les zones sont dans l\'espace du corps (200 × 300) et la tête est au-dessus du torse', () => {
      for (const [x, y, w, h] of Object.values(ZONES)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(BODY_W);
        expect(y + h).toBeLessThanOrEqual(BODY_H);
      }
      expect(ZONES.hat[1]).toBeLessThan(ZONES.face[1]);
      expect(ZONES.face[1] + ZONES.face[3]).toBeLessThanOrEqual(ZONES.body[1] + 8);
    });

    it('les repères se suivent de haut en bas', () => {
      const ys = [ANCHORS.chin, ANCHORS.neck, ANCHORS.shoulderL, ANCHORS.elbowL, ANCHORS.handL, ANCHORS.hipL, ANCHORS.kneeL, ANCHORS.footL].map((p) => p[1]);
      expect(ys).toEqual([...ys].sort((a, b) => a - b));
      expect(ANCHORS.footL[1]).toBe(290);
    });
  });
});
