import { defaultAvatar } from './avatar-config';
import { WARDROBE, previewOption } from './avatar-wardrobe';

describe('vignettes de la garde-robe', () => {
  const witch = { ...defaultAvatar(1), costume: 'costume-witch' };
  const options = (id: string) => WARDROBE.find((c) => c.id === id)!.groups.flatMap((g) => g.options).filter((o) => !o.none && !o.swatch);

  it('chaque vignette « Habit » montre son propre habit, sans le déguisement en cours', () => {
    const outfits = options('outfit');
    expect(outfits.length).toBeGreaterThan(5);
    const configs = outfits.map((o) => previewOption(o, witch));
    expect(configs.every((c) => c.costume === 'none')).toBe(true);
    expect(new Set(configs.map((c) => c.outfit)).size).toBe(outfits.length);
  });

  it('coiffures et chapeaux : le déguisement qui les cacherait est retiré', () => {
    for (const id of ['hair', 'hat']) {
      for (const o of options(id)) {
        expect(previewOption(o, witch).costume, o.key).toBe('none');
      }
    }
  });

  it('une vignette de déguisement montre ce déguisement ; les autres catégories ne touchent pas au déguisement', () => {
    const costume = options('costume')[0];
    expect(previewOption(costume, defaultAvatar(1)).costume).toBe(costume.key.split(':')[1]);
    for (const o of options('accessory')) {
      expect(previewOption(o, witch).costume, o.key).toBe('costume-witch');
    }
  });

  it('la config actuelle n\'est jamais modifiée', () => {
    previewOption(options('outfit')[0], witch);
    expect(witch.costume).toBe('costume-witch');
  });
});
