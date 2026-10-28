import { TestBed } from '@angular/core/testing';
import { defaultAvatar } from '../../avatar/avatar-config';
import { box, isometric, perspective } from './lab-3d';
import { ANCHORS, LabFigure } from './lab-body';
import { buildRoom } from './lab-rooms';

describe('labo de la chambre', () => {
  it('perspective : les meubles de droite montrent leur côté gauche, ceux de gauche leur côté droit', () => {
    const pr = perspective({ vx: 500, vy: 250, k0: 1.4, camX: 320, camY: 105, camZ: 1000 });
    const faces = (x0: number) => box(pr, { x0, x1: x0 + 100, y0: 0, y1: 60, z0: 0, z1: 40 }, '#c08d52').length;
    // devant + côté (+ dessus visible au-dessous de la ligne d'horizon), chacun avec son relief
    expect(faces(0)).toBeGreaterThanOrEqual(4);
    expect(faces(520)).toBeGreaterThanOrEqual(4);
  });

  it('isométrique : dessus et deux côtés visibles', () => {
    const pr = isometric({ cx: 500, cy: 200, k: 1 });
    // 3 faces × (couleur + relief) + arête du dessus
    expect(box(pr, { x0: 0, x1: 50, y0: 0, y1: 50, z0: 0, z1: 50 }, '#c08d52')).toHaveLength(7);
  });

  it.each(['A', 'B', 'C'] as const)('direction %s : une pièce complète avec un personnage, fermée ou armoire ouverte', (dir) => {
    const closed = buildRoom(dir, { armoireOpen: false });
    const open = buildRoom(dir, { armoireOpen: true });
    for (const room of [closed, open]) {
      expect(room.layers.filter((l) => l.figure)).toHaveLength(1);
      expect(room.layers.length).toBeGreaterThan(20);
    }
    const names = (r: typeof closed) => r.layers.map((l) => l.name);
    expect(names(closed)).toContain('portes');
    expect(names(open)).toContain('battants');
    expect(names(open)).not.toContain('portes');
    // le personnage est le dernier élément « physique » dessiné, juste avant le vignettage
    expect(names(closed).at(-2)).toBe('personnage');
  });

  it('les deux proportions : la tête fait ~40 % (chibi) et ~30 % (enfant) de la hauteur', () => {
    const head = (p: 'chibi' | 'enfant') => (ANCHORS[p].chin - (ANCHORS[p].chin - 91 * ANCHORS[p].headScale)) / 290;
    expect(head('chibi')).toBeGreaterThan(0.36);
    expect(head('chibi')).toBeLessThan(0.44);
    expect(head('enfant')).toBeGreaterThan(0.27);
    expect(head('enfant')).toBeLessThan(0.33);
  });

  it('le personnage entier est dessiné : corps, bras, mains, chaussures, tête', () => {
    const ref = TestBed.createComponent(LabFigure).componentRef;
    ref.setInput('config', defaultAvatar(3));
    ref.changeDetectorRef.detectChanges();
    const el = ref.location.nativeElement as SVGElement;
    expect(el.querySelectorAll('path, ellipse, circle, rect').length).toBeGreaterThan(40);
  });
});
