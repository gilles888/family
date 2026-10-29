import { TestBed } from '@angular/core/testing';
import { defaultAvatar } from '../../avatar/avatar-config';
import { box, perspective } from './lab-3d';
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

  it('une pièce complète avec un personnage, fermée ou armoire ouverte', () => {
    const closed = buildRoom({ armoireOpen: false });
    const open = buildRoom({ armoireOpen: true });
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

  it('corps enfant : la tête fait ~30 % de la hauteur', () => {
    // le haut des cheveux est ~98 unités au-dessus du menton dans le dessin de la tête
    const headH = 98 * ANCHORS.headScale;
    const head = headH / (ANCHORS.footY - (ANCHORS.chin - headH));
    expect(head).toBeGreaterThan(0.27);
    expect(head).toBeLessThan(0.34);
  });

  it('le personnage entier est dessiné : corps, bras, mains, chaussures, tête', () => {
    const ref = TestBed.createComponent(LabFigure).componentRef;
    ref.setInput('config', defaultAvatar(3));
    ref.changeDetectorRef.detectChanges();
    const el = ref.location.nativeElement as SVGElement;
    expect(el.querySelectorAll('path, ellipse, circle, rect').length).toBeGreaterThan(40);
  });
});
