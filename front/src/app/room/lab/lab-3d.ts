import { Shape, darken, lighten, path } from '../../shared/svg/shapes';

/** Mini-moteur 3D pour les maquettes : monde en unités (≈ 7,6 mm), Y vers le haut, mur du fond en Z = 0, mur gauche en X = 0. */
export type V3 = readonly [number, number, number];
export type P2 = [number, number];

export interface Projection {
  kind: 'persp' | 'iso';
  p(v: V3): P2;
  /** Pixels par unité à la profondeur de v. */
  scaleAt(v: V3): number;
  /** Vecteur de v vers la caméra (sert à savoir quelles faces se voient). */
  toCamera(v: V3): V3;
}

/** Perspective à un point de fuite : le mur du fond (Z = 0) est parallèle à l'écran. */
export function perspective(c: { vx: number; vy: number; k0: number; camX: number; camY: number; camZ: number }): Projection {
  const s = (z: number) => c.camZ / (c.camZ - z);
  return {
    kind: 'persp',
    p: ([x, y, z]) => [c.vx + (x - c.camX) * c.k0 * s(z), c.vy + (c.camY - y) * c.k0 * s(z)],
    scaleAt: ([, , z]) => c.k0 * s(z),
    toCamera: ([x, y, z]) => [c.camX - x, c.camY - y, c.camZ - z],
  };
}

/** Isométrique : les murs X = 0 et Z = 0 se rejoignent au coin du fond, en haut au milieu. */
export function isometric(c: { cx: number; cy: number; k: number }): Projection {
  return {
    kind: 'iso',
    p: ([x, y, z]) => [c.cx + (x - z) * 0.866 * c.k, c.cy + (x + z) * 0.5 * c.k - y * c.k],
    scaleAt: () => c.k,
    toCamera: () => [1, 1, 1],
  };
}

export interface Layer {
  shapes: Shape[];
  /** Id d'un filtre défini dans <defs> (ombres floues). */
  filter?: string;
  transform?: string;
  opacity?: number;
  /** Le personnage (composant labFigure) à la place de formes. */
  figure?: boolean;
  /** Id d'un clipPath défini dans <defs> (dans le repère local du calque). */
  clip?: string;
  /** Nom du calque, pour les tests et le débogage. */
  name?: string;
}

const fmt = (n: number) => Math.round(n * 10) / 10;

/** Polygone SVG (points déjà projetés). */
export function poly(points: P2[], fill: string, extra: Partial<Shape> = {}): Shape {
  return path('M' + points.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' L') + ' Z', fill, extra);
}

export function polyline(points: P2[], stroke: string, sw: number, extra: Partial<Shape> = {}): Shape {
  return path('M' + points.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' L'), 'none', { stroke, sw, ...extra });
}

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

interface Face {
  name: '+x' | '-x' | '+z' | '-z' | 'top';
  n: V3;
  c: V3[];
}

function facesOf(b: Box): Face[] {
  const { x0, x1, y0, y1, z0, z1 } = b;
  return [
    { name: '+x', n: [1, 0, 0], c: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    { name: '-x', n: [-1, 0, 0], c: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { name: '+z', n: [0, 0, 1], c: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { name: '-z', n: [0, 0, -1], c: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
    { name: 'top', n: [0, 1, 0], c: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
  ];
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Couleur d'une face selon sa normale : lumière douce venant du haut-gauche (dessus clair, côté droit plus sombre). */
export function faceColor(base: string, f: Face['name'], kind: Projection['kind']): string {
  if (f === 'top') return lighten(base, 0.22);
  if (kind === 'iso') return f === '+z' ? darken(base, 0.06) : darken(base, 0.26);
  return f === '+z' || f === '-z' ? base : f === '+x' ? darken(base, 0.2) : darken(base, 0.3);
}

/** Volume : les faces visibles seulement, avec dégradé de relief et arête claire sur le dessus. */
export function box(pr: Projection, b: Box, base: string, opts: { relief?: boolean } = {}): Shape[] {
  const out: Shape[] = [];
  const center: V3 = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2];
  const cam = pr.toCamera(center);
  for (const f of facesOf(b)) {
    const fc: V3 = [(f.c[0][0] + f.c[2][0]) / 2, (f.c[0][1] + f.c[2][1]) / 2, (f.c[0][2] + f.c[2][2]) / 2];
    if (dot(f.n, pr.toCamera(fc)) <= 0) continue;
    const pts = f.c.map((v) => pr.p(v));
    out.push(poly(pts, faceColor(base, f.name, pr.kind)));
    if (opts.relief !== false) out.push(poly(pts, f.name === 'top' ? 'url(#lab-top)' : f.name === '+x' || f.name === '-x' ? 'url(#lab-h)' : 'url(#lab-v)'));
    if (f.name === 'top') {
      // arête avant du dessus : un filet clair
      const front = f.c[0] && pr.p(f.c[0]);
      const front2 = pr.p(f.c[1]);
      out.push(polyline([front, front2], lighten(base, 0.55), 1.6, { opacity: 0.7 }));
    }
  }
  void cam;
  return out;
}

/** Ombre portée au sol d'un volume : son emprise décalée, floue (à mettre dans un calque avec le filtre lab-blur). */
export function shadowOf(pr: Projection, b: Box, dx = 14, dz = 12, opacity = 0.28): Shape {
  const pts = [[b.x0 + dx, b.z0], [b.x1 + dx, b.z0], [b.x1 + dx, b.z1 + dz], [b.x0 + dx, b.z1 + dz]].map(([x, z]) => pr.p([x, 0, z]));
  return poly(pts, '#3b1d0a', { opacity });
}

/** Ellipse posée sur le sol (tapis, ombre du personnage), en polygone. */
export function floorEllipse(pr: Projection, cx: number, cz: number, rx: number, rz: number, fill: string, extra: Partial<Shape> = {}): Shape {
  const pts: P2[] = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return pr.p([cx + Math.cos(a) * rx, 0, cz + Math.sin(a) * rz]);
  });
  return poly(pts, fill, extra);
}

/**
 * Décor plan collé sur un mur : dessiné dans un repère local à plat (origine en haut à gauche, y vers le bas) puis
 * envoyé sur le plan par une matrice affine (exacte en isométrique, très proche en perspective).
 */
export function decal(pr: Projection, origin: V3, along: V3, down: V3, w: number, h: number, shapes: Shape[], name?: string): Layer {
  const o = pr.p(origin);
  const u = pr.p([origin[0] + along[0], origin[1] + along[1], origin[2] + along[2]]);
  const v = pr.p([origin[0] + down[0], origin[1] + down[1], origin[2] + down[2]]);
  const m = [(u[0] - o[0]) / w, (u[1] - o[1]) / w, (v[0] - o[0]) / h, (v[1] - o[1]) / h, o[0], o[1]].map(fmt);
  return { shapes, transform: `matrix(${m.join(' ')})`, name };
}

/** Sprite posé en un point du monde : ses formes sont dessinées en unités du monde, origine = point d'ancrage. */
export function sprite(pr: Projection, anchor: V3, shapes: Shape[], name?: string): Layer {
  const [x, y] = pr.p(anchor);
  const k = pr.scaleAt(anchor);
  return { shapes, transform: `translate(${fmt(x)} ${fmt(y)}) scale(${fmt(k * 1000) / 1000})`, name };
}

/** Quadrilatère 3D → polygone écran. */
export function quad(pr: Projection, pts: V3[], fill: string, extra: Partial<Shape> = {}): Shape {
  return poly(pts.map((v) => pr.p(v)), fill, extra);
}
