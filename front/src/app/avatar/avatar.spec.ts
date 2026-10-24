import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AvatarConfig, DEFAULT_EYE_COLOR, defaultAvatar, normalizeAvatar } from './avatar-config';
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

  const layers = () => [...el.querySelectorAll('[data-layer]')].map((g) => g.getAttribute('data-layer'));
  const part = (layer: string) => el.querySelector(`g[data-layer="${layer}"]`)?.getAttribute('data-part');

  it('dessine les calques de la config dans l’ordre, du fond vers l’avant', () => {
    render({ config: CONFIG, size: 120 });

    expect(layers()).toEqual(['background', 'body', 'hair-back', 'head', 'body-front', 'eyes', 'mouth', 'hair-front', 'hat']);
    expect(layers()).toEqual(LAYER_ORDER.filter((l) => layers().includes(l)));
    expect(part('hat')).toBe('hat-crown');
    expect(part('eyes')).toBe('eyes-happy');
    expect(el.style.width).toBe('120px');
  });

  it('applique les couleurs choisies : fond, cheveux, habit, teint', () => {
    render({ config: CONFIG });

    expect(el.querySelector('[data-layer="background"]')?.getAttribute('fill')).toBe('#fde68a');
    expect(el.querySelector('g[data-layer="hair-front"] path')?.getAttribute('fill')).toBe('#6b3e26');
    expect(el.querySelector('g[data-layer="body"] path:nth-of-type(2)')?.getAttribute('fill')).toBe('#3b82f6');
    expect(el.querySelector('g[data-layer="head"] ellipse')?.getAttribute('fill')).toBe('#e0ac69');
  });

  it('« aucun » chapeau ni accessoire : pas de calque', () => {
    render({ config: { ...CONFIG, hat: 'none' } });

    expect(layers()).not.toContain('hat');
    expect(layers()).not.toContain('accessory');
  });

  it('membre sans avatar : avatar par défaut, toujours le même pour un même id', () => {
    render({ member: { id: 7, nom: 'Léa', couleur: '#E91E63' }, label: 'Léa' });
    const first = el.innerHTML;
    render({ member: { id: 7, nom: 'Léa', couleur: '#E91E63' }, label: 'Léa' });

    expect(el.innerHTML).toBe(first);
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

      expect(normalizeAvatar({ ...CONFIG, eyeColor: '#1e88e5' }, fallback).eyeColor).toBe('#1e88e5');
      expect(normalizeAvatar(CONFIG, fallback).eyeColor).toBe(DEFAULT_EYE_COLOR);
      expect(normalizeAvatar({ ...CONFIG, eyeColor: 'blue' }, fallback).eyeColor).toBe(DEFAULT_EYE_COLOR);
      expect(normalizeAvatar({ ...CONFIG, eyeColor: '#12" onload="x' }, fallback).eyeColor).toBe(DEFAULT_EYE_COLOR);
      expect(normalizeAvatar(null, fallback).eyeColor).toBe(DEFAULT_EYE_COLOR);
    });

    it('rendu : l’iris prend la couleur des yeux, la pupille reste noire', () => {
      render({ config: { ...CONFIG, eyes: 'eyes-round', eyeColor: '#1e88e5' } });

      const fills = [...el.querySelectorAll('g[data-layer="eyes"] circle')].map((c) => c.getAttribute('fill'));
      expect(iris()).toBe('#1e88e5');
      expect(fills).toContain(DEFAULT_EYE_COLOR);
    });

    it('ancien avatar sans couleur des yeux : iris noir', () => {
      render({ config: normalizeAvatar({ ...CONFIG, eyes: 'eyes-round' }, defaultAvatar(1)) });

      expect(iris()).toBe(DEFAULT_EYE_COLOR);
    });
  });
});
