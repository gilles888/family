import { Shape, darken, lighten, line, rect } from '../../shared/svg/shapes';
import {
  CHEST_FRONT, CURTAINS, DIE_FRONT, HAT_BEANIE, HAT_CAP, HAT_CROWN, MIRROR, PIG_SPRITE, POSTER, SHOP_DOOR, SIGN, WINDOW_FRAME, WOOD,
  WOOD_DARK, WOOD_LIGHT, drawers, wardrobeDoors, wardrobeInside, windowView,
} from './lab-art';
import { Box, Layer, Projection, V3, box, decal, floorEllipse, perspective, poly, polyline, quad, shadowOf, sprite } from './lab-3d';

export interface RoomModel {
  layers: Layer[];
  /** Hauteur du personnage dans l'espace du dessin (pour la mise à l'échelle de labFigure). */
  figure: { transform: string };
}

interface Dims {
  W: number;
  Dp: number;
  H: number;
}

/** Repère d'un mur : l'origine au pied du mur, `a` le long du mur, `n` vers l'intérieur de la pièce. */
interface Frame {
  o: V3;
  a: V3;
  n: V3;
}

const at = (f: Frame, a: number, n: number, y: number): V3 => [f.o[0] + f.a[0] * a + f.n[0] * n, y, f.o[2] + f.a[2] * a + f.n[2] * n];

/** Volume rangé contre un mur : a0..a1 le long du mur, n0..n1 en profondeur, y0..y1 en hauteur. */
function lbox(f: Frame, a0: number, a1: number, n0: number, n1: number, y0: number, y1: number): Box {
  const p = [at(f, a0, n0, y0), at(f, a1, n1, y1)];
  return {
    x0: Math.min(p[0][0], p[1][0]),
    x1: Math.max(p[0][0], p[1][0]),
    y0,
    y1,
    z0: Math.min(p[0][2], p[1][2]),
    z1: Math.max(p[0][2], p[1][2]),
  };
}

/** Sprite / décor posé sur la face avant d'un meuble ou d'un mur du repère f. */
function onWall(pr: Projection, f: Frame, a0: number, n: number, yTop: number, w: number, h: number, shapes: Shape[], name?: string): Layer {
  return decal(pr, at(f, a0, n, yTop), [f.a[0] * w, 0, f.a[2] * w], [0, -h, 0], w, h, shapes, name);
}

const sorted = <T extends { key: number }>(items: T[]) => items.sort((x, y) => x.key - y.key);

/** Pièce complète en direction A : vue de face, 2,5D douce. */
export function buildRoom(opts: { armoireOpen: boolean; night?: boolean }): RoomModel {
  const dims: Dims = { W: 760, Dp: 360, H: 280 };
  const pr = perspective({ vx: 500, vy: 270, k0: 1.28, camX: 380, camY: 70, camZ: 1000 });
  const { W, Dp, H } = dims;
  const L: Layer[] = [];
  const push = (...layers: Layer[]) => L.push(...layers);

  const back: Frame = { o: [0, 0, 0], a: [1, 0, 0], n: [0, 0, 1] };
  const left: Frame = { o: [0, 0, 0], a: [0, 0, 1], n: [1, 0, 0] };

  // ---------- murs, plafond, sol
  const wallBase = '#fde4d2';
  const floorBase = '#e9c9a0';
  push({
    name: 'murs',
    shapes: [
      quad(pr, [[0, 0, Dp], [0, 0, 0], [0, H, 0], [0, H, Dp]], darken(wallBase, 0.07)),
      quad(pr, [[0, 0, Dp], [0, 0, 0], [0, H, 0], [0, H, Dp]], 'url(#lab-wall)'),
      quad(pr, [[W, 0, 0], [W, 0, Dp], [W, H, Dp], [W, H, 0]], darken(wallBase, 0.12)),
      quad(pr, [[W, 0, 0], [W, 0, Dp], [W, H, Dp], [W, H, 0]], 'url(#lab-wall)'),
      quad(pr, [[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]], wallBase),
      quad(pr, [[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]], 'url(#lab-wall)'),
      quad(pr, [[0, H, 0], [W, H, 0], [W, H, Dp], [0, H, Dp]], lighten(wallBase, 0.35)),
    ],
  });
  // papier peint rayé (dos), lambris et plinthes
  const stripes: Shape[] = [];
  const stripeStep = 44;
  for (let x = 12; x < W - 10; x += stripeStep) {
    stripes.push(quad(pr, [[x, 70, 0], [x + 14, 70, 0], [x + 14, H, 0], [x, H, 0]], darken(wallBase, 0.035)));
  }
  push({ name: 'papier-peint', shapes: stripes });
  const wainscot = (corners: (h: number) => V3[], color: string): Shape[] => [
    quad(pr, corners(70), color),
    quad(pr, corners(70), 'url(#lab-v)'),
    polyline([pr.p(corners(70)[3]), pr.p(corners(70)[2])], lighten(color, 0.5), 2.2),
    quad(pr, corners(9), lighten(color, 0.5)),
  ];
  push({
    name: 'lambris',
    shapes: [
      ...wainscot((h) => [[0, 0, 0], [W, 0, 0], [W, h, 0], [0, h, 0]], '#f2c9ab'),
      ...wainscot((h) => [[0, 0, Dp], [0, 0, 0], [0, h, 0], [0, h, Dp]], '#e7bb9a'),
    ],
  });
  // sol : lames qui convergent, joints décalés
  const floor: Shape[] = [quad(pr, [[0, 0, 0], [W, 0, 0], [W, 0, Dp], [0, 0, Dp]], floorBase), quad(pr, [[0, 0, 0], [W, 0, 0], [W, 0, Dp], [0, 0, Dp]], 'url(#lab-top)')];
  const board = 64;
  for (let x = board, i = 1; x < W; x += board, i++) {
    floor.push(polyline([pr.p([x, 0, 0]), pr.p([x, 0, Dp])], '#c9a06e', 1.2, { opacity: 0.7 }));
    for (let z = (i % 2) * 90; z < Dp; z += 180) {
      floor.push(polyline([pr.p([x - board, 0, z]), pr.p([x, 0, z])], '#c9a06e', 1, { opacity: 0.6 }));
    }
  }
  push({ name: 'sol', shapes: floor });
  // ombres de coin : mur / sol et mur / mur (floues)
  push({
    name: 'ombres-coin',
    filter: 'lab-blur',
    shapes: [
      polyline([pr.p([0, 0, 0]), pr.p([W, 0, 0])], '#3b1d0a', 16, { opacity: 0.32 }),
      polyline([pr.p([0, 0, 0]), pr.p([0, 0, Dp])], '#3b1d0a', 16, { opacity: 0.3 }),
      polyline([pr.p([0, 0, 0]), pr.p([0, H, 0])], '#3b1d0a', 14, { opacity: 0.22 }),
      polyline([pr.p([W, 0, 0]), pr.p([W, H, 0])], '#3b1d0a', 14, { opacity: 0.2 }),
    ],
  });

  // ---------- fenêtre (vue sur dehors, rideaux, rebord) et lumière
  const winA = 160; // position le long du mur du fond
  const winY = 105;
  const winW = 120;
  const winH = 100;
  push({ ...onWall(pr, back, winA, 0, winY + winH, winW, winH, windowView(opts.night), 'vue-fenetre'), clip: 'lab-window-clip' });
  push(onWall(pr, back, winA, 0, winY + winH, winW, winH, WINDOW_FRAME, 'cadre-fenetre'));
  push(onWall(pr, back, winA, 0, winY + winH + 6, winW, winH, CURTAINS, 'rideaux'));
  push({ name: 'rebord', shapes: box(pr, lbox(back, winA - 6, winA + winW + 6, 0, 11, winY - 5, winY), '#fffaf3') });
  // halo sur le mur et rayon de soleil au sol
  push({
    name: 'halo',
    filter: 'lab-blur-soft',
    shapes: [
      quad(pr, [[winA - 30, winY - 20, 0], [winA + winW + 30, winY - 20, 0], [winA + winW + 30, winY + winH + 30, 0], [winA - 30, winY + winH + 30, 0]], '#fff7d6', { opacity: 0.5 }),
      quad(pr, [[winA, 0, 2], [winA + winW, 0, 2], [winA + winW + 120, 0, 300], [winA + 110, 0, 300]], '#fffbe0', { opacity: opts.night ? 0.12 : 0.42 }),
    ],
  });

  // ---------- meubles (dessinés du fond vers l'avant)
  const items: { key: number; layers: Layer[] }[] = [];
  const add = (key: number, ...layers: Layer[]) => items.push({ key, layers });
  const shadowLayer = (b: Box): Layer => ({ name: 'ombre', filter: 'lab-blur', shapes: [shadowOf(pr, b)] });

  /** Armoire à deux portes. */
  const armoire = (f: Frame, a0: number, key: number) => {
    const w = 120;
    const d = 52;
    const h = 244;
    const body = lbox(f, a0, a0 + w, 0, d, 0, h);
    const layers: Layer[] = [shadowLayer(body), { name: 'armoire', shapes: [...box(pr, body, WOOD), ...box(pr, lbox(f, a0 - 4, a0 + w + 4, 0, d + 4, h, h + 10), WOOD_DARK), ...box(pr, lbox(f, a0 + 4, a0 + w - 4, 0, d, 0, 8), WOOD_DARK)] }];
    if (!opts.armoireOpen) {
      layers.push(onWall(pr, f, a0, d, h, w, h, wardrobeDoors(w, h), 'portes'));
    } else {
      layers.push(onWall(pr, f, a0 + 6, d, h - 8, w - 12, h - 18, wardrobeInside(w - 12, h - 18), 'interieur'));
      // battants ouverts à ~105° sur leurs charnières
      const dw = (w - 8) / 2;
      const th = (105 * Math.PI) / 180;
      const hingeL = a0 + 4;
      const hingeR = a0 + w - 4;
      const tipL: [number, number] = [hingeL + dw * Math.cos(th), d + dw * Math.sin(th)];
      const tipR: [number, number] = [hingeR - dw * Math.cos(th), d + dw * Math.sin(th)];
      const door = (hinge: number, tip: [number, number]): Shape[] => {
        const q: V3[] = [at(f, hinge, d, 8), at(f, tip[0], tip[1], 8), at(f, tip[0], tip[1], h - 8), at(f, hinge, d, h - 8)];
        const inset = (t: number): V3[] => {
          const lerp = (p: V3, q2: V3, k: number): V3 => [p[0] + (q2[0] - p[0]) * k, p[1] + (q2[1] - p[1]) * k, p[2] + (q2[2] - p[2]) * k];
          const lo = lerp(q[0], q[1], t);
          const hi = lerp(q[0], q[1], 1 - t);
          return [lerp(lo, lerp(q[3], q[2], t), 0), hi, lerp(q[3], q[2], 1 - t), lerp(q[3], q[2], t)].map((v, i) => (i === 0 ? [lo[0], 22, lo[2]] : i === 1 ? [hi[0], 22, hi[2]] : i === 2 ? [hi[0], h - 22, hi[2]] : [lerp(q[3], q[2], t)[0], h - 22, lerp(q[3], q[2], t)[2]]) as V3);
        };
        return [quad(pr, q, WOOD_LIGHT), quad(pr, q, 'url(#lab-h)'), quad(pr, inset(0.18), 'none', { stroke: WOOD_DARK, sw: 2 }), polyline([pr.p(q[0]), pr.p(q[3])], WOOD_DARK, 2.5)];
      };
      layers.push({ name: 'battants', shapes: [...door(hingeL, tipL), ...door(hingeR, tipR)] });
    }
    add(key, ...layers);
  };

  /** Commode à trois tiroirs, avec le dé de « Surprise ! » dessus. */
  const commode = (f: Frame, a0: number, key: number) => {
    const w = 112;
    const d = 46;
    const h = 100;
    const body = lbox(f, a0, a0 + w, 0, d, 0, h);
    add(
      key,
      shadowLayer(body),
      { name: 'commode', shapes: [...box(pr, body, WOOD), ...box(pr, lbox(f, a0 - 4, a0 + w + 4, -0, d + 5, h, h + 5), WOOD_DARK)] },
      onWall(pr, f, a0, d, h - 2, w, h - 4, drawers(w, h - 4), 'tiroirs'),
      { name: 'de', shapes: box(pr, lbox(f, a0 + 66, a0 + 82, 12, 28, h + 5, h + 21), '#ffffff') },
      onWall(pr, f, a0 + 66, 28, h + 21, 16, 16, DIE_FRONT, 'de-points'),
    );
    return { top: h + 5 };
  };

  /** Étagère murale avec des objets posés dessus (sprites ancrés sur la planche). */
  const shelf = (f: Frame, a0: number, w: number, y: number, key: number, things: { a: number; shapes: Shape[]; s?: number }[]) => {
    const board = lbox(f, a0, a0 + w, 0, 24, y, y + 5);
    add(
      key,
      { name: 'etagere', shapes: [...box(pr, board, WOOD_DARK), ...box(pr, lbox(f, a0 + 8, a0 + 16, 0, 20, y - 14, y), '#8d6e63'), ...box(pr, lbox(f, a0 + w - 16, a0 + w - 8, 0, 20, y - 14, y), '#8d6e63')] },
      ...things.map((t, i) => {
        const l = sprite(pr, at(f, a0 + t.a, 12, y + 5), t.shapes, `objet-${i}`);
        return { ...l, transform: l.transform + (t.s ? ` scale(${t.s})` : '') };
      }),
    );
  };

  /** Coiffeuse : plateau, pieds, tiroir, tabouret, miroir au mur. */
  const vanity = (f: Frame, a0: number, key: number) => {
    const w = 112;
    const d = 40;
    const legs = [0, 1].flatMap((i) => [0, 1].map((j) => lbox(f, a0 + 4 + i * (w - 12), a0 + 8 + i * (w - 12), 4 + j * (d - 12), 8 + j * (d - 12), 0, 60)));
    add(
      key,
      shadowLayer(lbox(f, a0, a0 + w, 0, d, 0, 62)),
      onWall(pr, f, a0 + 26, 0, 168, 60, 90, MIRROR, 'miroir'),
      { name: 'coiffeuse', shapes: [...legs.flatMap((b) => box(pr, b, WOOD_DARK)), ...box(pr, lbox(f, a0, a0 + w, 0, d, 60, 66), WOOD), ...box(pr, lbox(f, a0 + 20, a0 + w - 20, 2, d - 2, 40, 60), WOOD_LIGHT)] },
      sprite(pr, at(f, a0 + 20, 20, 66), [rect(0, -22, 9, 22, 3, '#f48fb1'), rect(14, -16, 8, 16, 3, '#81d4fa'), rect(86, -9, 12, 9, 4, '#fff59d')], 'flacons'),
      { name: 'tabouret', shapes: [...box(pr, lbox(f, a0 + 36, a0 + 76, 56, 94, 0, 30), '#f48fb1'), ...box(pr, lbox(f, a0 + 38, a0 + 74, 58, 92, 28, 36), '#f8bbd0')] },
    );
  };

  /** Coffre à jouets. */
  const chest = (f: Frame, a0: number, nOff: number, key: number) => {
    const w = 96;
    const d = 46;
    const body = lbox(f, a0, a0 + w, nOff, nOff + d, 0, 34);
    add(
      key,
      shadowLayer(body),
      { name: 'coffre', shapes: [...box(pr, body, '#e9837f'), ...box(pr, lbox(f, a0 - 2, a0 + w + 2, nOff - 2, nOff + d + 2, 34, 46), '#d9686a')] },
      onWall(pr, f, a0, nOff + d, 34, w, 34, CHEST_FRONT, 'bandes'),
    );
  };

  /** Porte de la boutique : bois, auvent rayé, enseigne. */
  const shopDoor = (f: Frame, a0: number, key: number) => {
    const w = 66;
    const h = 190;
    const stripes: Shape[] = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x0 = a0 - 8 + (i * (w + 16)) / n;
      const x1 = a0 - 8 + ((i + 1) * (w + 16)) / n;
      const c = i % 2 === 0 ? '#e53935' : '#fff4e6';
      stripes.push(quad(pr, [at(f, x0, 0, h + 14), at(f, x1, 0, h + 14), at(f, x1, 34, h - 6), at(f, x0, 34, h - 6)], c));
      stripes.push(quad(pr, [at(f, x0, 34, h - 6), at(f, x1, 34, h - 6), at(f, x1, 34, h - 20), at(f, x0, 34, h - 20)], darken(c, 0.14)));
    }
    add(
      key,
      onWall(pr, f, a0, 0, h, w, h, SHOP_DOOR, 'porte'),
      onWall(pr, f, a0, 0, h + 40, w, 22, SIGN, 'enseigne'),
      { name: 'auvent', shapes: stripes },
    );
  };

  // ---------- dispositions : le personnage se tient devant la partie vide du mur (poster), la fenêtre reste dégagée
  const figAnchor: V3 = [480, 0, 215];
  armoire(back, 14, 1);
  commode(back, 310, 3);
  shelf(back, 310, 112, 168, 2, [
    { a: 20, shapes: HAT_CAP },
    { a: 54, shapes: HAT_BEANIE },
    { a: 88, shapes: HAT_CROWN },
  ]);
  add(2.2, onWall(pr, back, 440, 0, 190, 70, 50, POSTER, 'tableau'));
  vanity(back, 570, 4);
  shelf(back, 564, 124, 188, 2.5, [{ a: 62, shapes: PIG_SPRITE, s: 1.1 }]);
  shopDoor(back, 700, 3.5);
  chest(back, 70, 110, 8);

  // tapis sous le personnage, puis meubles du fond vers l'avant
  push({ name: 'tapis', shapes: [floorEllipse(pr, figAnchor[0], figAnchor[2], 140, 80, '#f6a8c4'), floorEllipse(pr, figAnchor[0], figAnchor[2], 118, 64, '#ef86ad', { opacity: 0.6 }), floorEllipse(pr, figAnchor[0], figAnchor[2], 98, 52, 'none', { stroke: '#ffffff', sw: 2.5, opacity: 0.85 })] });
  for (const it of sorted(items)) push(...it.layers);

  // personnage : debout sur le tapis, ombre au sol
  push({ name: 'ombre-personnage', filter: 'lab-blur', shapes: [floorEllipse(pr, figAnchor[0], figAnchor[2], 26, 11, '#3b1d0a', { opacity: 0.4 })] });
  const [px, py] = pr.p(figAnchor);
  const sc = (pr.scaleAt(figAnchor) * 176) / 290;
  const figure: Layer = { name: 'personnage', shapes: [], figure: true, transform: `translate(${Math.round((px - 100 * sc) * 10) / 10} ${Math.round((py - 290 * sc) * 10) / 10}) scale(${Math.round(sc * 1000) / 1000})` };
  push(figure);
  // éclairage général : léger vignettage
  push({ name: 'vignette', shapes: [rect(0, 0, 1000, 600, 0, 'url(#lab-vignette)')] });
  void line;
  return { layers: L, figure: { transform: figure.transform ?? '' } };
}
