/**
 * Formes SVG des catalogues (pièces d'avatar, icônes de routine), décrites en données (pas de chaîne HTML : rien à désinfecter, et les couleurs
 * venant du serveur ne sont jamais insérées telles quelles). Toutes les pièces partagent le viewBox 0 0 200 200 :
 * elles s'emboîtent sans calcul.
 *
 * Couleurs : une valeur #RRGGBB, 'none', ou un jeton résolu au rendu :
 *   $c couleur de la pièce (cheveux, habit, teint…), $d plus foncée, $dd bien plus foncée, $l plus claire,
 *   $skin / $skinD teint (et teint ombré), $hair couleur des cheveux.
 */
export type Paint = string;

export interface Shape {
  el: 'path' | 'circle' | 'ellipse' | 'rect';
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fill?: Paint;
  stroke?: Paint;
  sw?: number;
  opacity?: number;
}

/** Couleurs du contexte de rendu d'une pièce. */
export interface PaintContext {
  color: string;
  skin: string;
  hair: string;
}

// ---------- fabriques (écriture compacte du catalogue)

export const path = (d: string, fill: Paint = '$c', extra: Partial<Shape> = {}): Shape => ({ el: 'path', d, fill, ...extra });
export const circle = (cx: number, cy: number, r: number, fill: Paint = '$c', extra: Partial<Shape> = {}): Shape => ({
  el: 'circle',
  cx,
  cy,
  r,
  fill,
  ...extra,
});
export const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: Paint = '$c', extra: Partial<Shape> = {}): Shape => ({
  el: 'ellipse',
  cx,
  cy,
  rx,
  ry,
  fill,
  ...extra,
});
export const rect = (x: number, y: number, w: number, h: number, rx = 0, fill: Paint = '$c', extra: Partial<Shape> = {}): Shape => ({
  el: 'rect',
  x,
  y,
  w,
  h,
  rx,
  fill,
  ...extra,
});
/** Trait sans remplissage, bouts arrondis (yeux rieurs, sourires…). */
export const line = (d: string, stroke: Paint = INK, sw = 3.5, extra: Partial<Shape> = {}): Shape => ({
  el: 'path',
  d,
  fill: 'none',
  stroke,
  sw,
  ...extra,
});

/** Étoile à 5 branches centrée en (cx, cy). */
export function star(cx: number, cy: number, outer: number, inner: number, fill: Paint): Shape {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${round(cx + radius * Math.cos(angle))} ${round(cy + radius * Math.sin(angle))}`;
  });
  return path(`M${points.join(' L')} Z`, fill);
}

/** Encre des traits du visage. */
export const INK = '#2d2a32';

// ---------- couleurs

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

/** Mélange deux couleurs #RRGGBB (ratio 0 = a, 1 = b). */
export function mix(a: string, b: string, ratio: number): string {
  const [ra, ga, ba] = rgb(a);
  const [rb, gb, bb] = rgb(b);
  const channel = (x: number, y: number) =>
    Math.round(x + (y - x) * ratio)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(ra, rb)}${channel(ga, gb)}${channel(ba, bb)}`;
}

export const darken = (color: string, amount: number) => mix(color, '#000000', amount);
export const lighten = (color: string, amount: number) => mix(color, '#ffffff', amount);

/**
 * Version franche d'une couleur pastel (même teinte, saturée et plus sombre) : numéro et case à cocher d'une ligne
 * de routine. Assombrir un pastel donnerait un gris terne.
 */
export function vivid(color: string, saturation = 0.62, lightness = 0.46): string {
  const [r, g, b] = rgb(color).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r1)}${hex(g1)}${hex(b1)}`;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Résout un jeton de couleur ($c, $d…) dans son contexte. */
export function resolvePaint(paint: Paint | undefined, ctx: PaintContext): string | undefined {
  switch (paint) {
    case undefined:
      return undefined;
    case '$c':
      return ctx.color;
    case '$d':
      return darken(ctx.color, 0.18);
    case '$dd':
      return darken(ctx.color, 0.35);
    case '$l':
      return lighten(ctx.color, 0.35);
    case '$skin':
      return ctx.skin;
    case '$skinD':
      return darken(ctx.skin, 0.12);
    case '$hair':
      return ctx.hair;
    default:
      return paint;
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
