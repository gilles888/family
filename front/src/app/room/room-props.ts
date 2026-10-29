import { Shape, circle, darken, ellipse, line, path, rect, star } from '../shared/svg/shapes';

/** Dessins 2D des maquettes (décors collés sur les murs, accessoires posés), en unités du monde. */

export const WOOD = '#dcae74';
export const WOOD_DARK = '#b98550';
export const WOOD_LIGHT = '#f0cf9f';

export type WindowSeason = 'ete' | 'automne' | 'hiver' | 'printemps';

/**
 * Vue par la fenêtre (120 × 100) : le ciel est le fond choisi dans la garde-robe (`sky`), puis soleil ou lune et étoiles,
 * nuages, colline et arbre qui suivent la saison (feuilles vertes, orangées, roses ou neige).
 */
export function windowView(opts: { sky: string; night?: boolean; season?: WindowSeason }): Shape[] {
  const { sky, night = false, season = 'ete' } = opts;
  const ground = season === 'hiver' ? ['#f4f8fb', '#e3edf5'] : season === 'automne' ? ['#c9a85a', '#b08d45'] : ['#7cc576', '#5fae62'];
  const crown = season === 'hiver' ? ['#fafcff', '#e3edf5', '#dbe7f1'] : season === 'automne' ? ['#e65100', '#fb8c00', '#ef6c00'] : season === 'printemps' ? ['#f48fb1', '#f8bbd0', '#f06292'] : ['#43a047', '#4caf50', '#388e3c'];
  const trunk = '#8d6e63';
  const sunMoon = night
    ? [circle(88, 24, 11, '#fff9c4'), circle(92, 21, 10, '#2a3a78', { opacity: 0.9 }), ...[[20, 18], [44, 30], [70, 12], [30, 50], [100, 54]].map(([x, y]) => star(x, y, 3.2, 1.4, '#fff59d'))]
    : [circle(92, 24, 20, '#fff3b0', { opacity: 0.35 }), circle(92, 24, 13, '#fff3b0'), ellipse(32, 26, 20, 8, '#ffffff', { opacity: 0.95 }), ellipse(46, 22, 14, 7, '#ffffff', { opacity: 0.95 }), ellipse(74, 48, 16, 6, '#ffffff', { opacity: 0.85 })];
  return [
    rect(0, 0, 120, 100, 0, sky),
    ...(night ? [rect(0, 0, 120, 100, 0, '#12204f', { opacity: 0.55 })] : []),
    ...sunMoon,
    ellipse(30, 104, 74, 30, night ? darken(ground[0], 0.45) : ground[0]),
    ellipse(100, 108, 60, 26, night ? darken(ground[1], 0.45) : ground[1]),
    // arbre : tronc, feuillage en trois boules
    rect(27, 58, 7, 32, 2, trunk),
    circle(30, 50, 15, night ? darken(crown[0], 0.4) : crown[0]),
    circle(21, 58, 11, night ? darken(crown[1], 0.4) : crown[1]),
    circle(40, 57, 11, night ? darken(crown[2], 0.4) : crown[2]),
    ...(season === 'automne' ? [circle(60, 80, 2.6, '#e65100'), circle(72, 70, 2.2, '#fb8c00')] : []),
    ...(season === 'hiver' ? [0, 1, 2, 3, 4, 5].map((i) => circle(14 + i * 19, 12 + ((i * 29) % 70), 1.8, '#ffffff', { opacity: 0.9 })) : []),
  ];
}

/** Cadre blanc de la fenêtre, croisillons et reflet sur la vitre (120 × 100). */
export const WINDOW_FRAME: Shape[] = [
  rect(-5, -5, 130, 110, 6, 'none', { stroke: '#fffdf8', sw: 10 }),
  line('M60 0 V100', '#fffdf8', 5),
  line('M0 50 H120', '#fffdf8', 5),
  path('M8 8 L52 8 L8 56 Z', 'url(#room-glass)'),
  path('M68 56 L112 56 L112 92 Z', 'url(#room-glass)', { opacity: 0.6 }),
];

/** Rideaux roses relevés sur les côtés (120 × 100), un pan de chaque côté. */
export const CURTAIN_LEFT: Shape[] = [
  path('M-8 -10 H22 Q14 40 20 104 H-8 Z', '#f6a9c6'),
  path('M8 -8 Q4 40 10 102', 'none', { stroke: '#e98bb0', sw: 3, opacity: 0.8 }),
];
export const CURTAIN_RIGHT: Shape[] = [
  path('M128 -10 H98 Q106 40 100 104 H128 Z', '#f6a9c6'),
  path('M112 -8 Q116 40 110 102', 'none', { stroke: '#e98bb0', sw: 3, opacity: 0.8 }),
];
export const CURTAIN_ROD: Shape[] = [rect(-12, -12, 144, 6, 3, '#8d6e63')];
/** Miroir ovale de la coiffeuse (60 × 90). */
export const MIRROR: Shape[] = [
  ellipse(30, 45, 30, 45, WOOD_DARK),
  ellipse(30, 45, 25, 40, '#e3f6ff'),
  ellipse(30, 45, 25, 40, 'url(#room-glass)'),
  path('M14 30 Q20 16 34 12', 'none', { stroke: '#ffffff', sw: 4, opacity: 0.9 }),
];

/** Porte en bois à panneaux, poignée en laiton (66 × 190). */
export const SHOP_DOOR: Shape[] = [
  rect(0, 0, 66, 190, 4, '#8a5a35'),
  rect(5, 5, 56, 180, 3, '#c88a55'),
  ...[0, 1].flatMap((c) => [0, 1].map((r) => rect(11 + c * 25, 14 + r * 84, 19, 72, 3, '#b87942', { stroke: '#98602f', sw: 2 }))),
  circle(55, 98, 4, '#ffd54f'),
  circle(54, 97, 1.6, '#fff8c4'),
];

/** Enseigne : une pièce d'or entre deux étoiles sur un panneau bleu (66 × 22). */
export const SIGN: Shape[] = [
  rect(0, 0, 66, 22, 5, '#26688f'),
  rect(2, 2, 62, 18, 4, 'none', { stroke: '#ffffff', sw: 1.4, opacity: 0.8 }),
  circle(33, 11, 7.5, '#ffd54f'),
  circle(33, 11, 4.6, 'none', { stroke: '#f9a825', sw: 1.2 }),
  star(14, 11, 4, 1.8, '#fff59d'),
  star(52, 11, 4, 1.8, '#fff59d'),
];

/** Tableau : un paysage dans un cadre (60 × 44). */
export const POSTER: Shape[] = [
  rect(0, 0, 60, 44, 3, WOOD_DARK),
  rect(4, 4, 52, 36, 2, '#bfe6ff'),
  ellipse(20, 44, 30, 14, '#7cc576'),
  circle(44, 14, 6, '#ffe082'),
  path('M30 40 L38 22 L48 40 Z', '#8d9db6'),
];

/** Trois livres debout sur l'étagère (origine = base, à gauche ; ≈ 36 de large). */
export const BOOKS: Shape[] = [
  rect(0, -26, 9, 26, 2, '#7e57c2'),
  star(4.5, -13, 3, 1.3, '#ffd54f'),
  rect(10, -22, 8, 22, 2, '#26a69a'),
  path('M19 0 L22 -24 L30 -22 L27 0 Z', '#ef5350'),
];

/** Tirelire cochon posée (largeur ≈ 46) ; la pièce entre dans la fente sur le dos : elle est dessinée DERRIÈRE le cochon. */
export const PIG_SPRITE: Shape[] = [
  // pièce verticale, à moitié dans la fente
  ellipse(2, -26, 7.5, 9, '#ffd54f', { stroke: '#f9a825', sw: 1.6 }),
  ellipse(2, -26, 3.6, 5, 'none', { stroke: '#f9a825', sw: 1 }),
  // corps, oreilles, groin, pattes, queue
  ellipse(0, -14, 24, 15, '#f9b3cc'),
  path('M-8 -26 L-12 -35 L-3 -29 Z', '#f08fb2'),
  path('M6 -27 L11 -36 L15 -26 Z', '#f08fb2'),
  ellipse(23, -12, 7, 6, '#f08fb2'),
  circle(21.5, -12, 1.2, '#b03060'),
  circle(25, -12, 1.2, '#b03060'),
  circle(15, -18, 2, '#3e2723'),
  rect(-14, -4, 7, 6, 2, '#f08fb2'),
  rect(8, -4, 7, 6, 2, '#f08fb2'),
  path('M-24 -16 q-8 -3 -4 -10', 'none', { stroke: '#f08fb2', sw: 2.5 }),
  rect(-3, -29.6, 11, 2.6, 1.3, '#c2185b'),
  ellipse(-6, -19, 8, 5, '#ffffff', { opacity: 0.25 }),
  ellipse(0, -0.5, 22, 2.2, '#3b1d0a', { opacity: 0.15 }),
];

/** Chapeaux posés sur l'étagère : casquette, bonnet, couronne (origine = base du chapeau sur la planche). */
export const HAT_CAP: Shape[] = [
  path('M-15 0 C-15 -16 -7 -21 0 -21 C7 -21 15 -16 15 0 Z', '#e53935'),
  path('M3 -3 C12 -5 24 -4 28 -1 L28 0 C20 2 10 2 3 0 Z', '#b71c1c'),
  circle(0, -21, 2, '#b71c1c'),
  ellipse(-5, -14, 4, 2.4, '#ffffff', { opacity: 0.3 }),
];
export const HAT_BEANIE: Shape[] = [
  path('M-13 0 C-13 -17 -6 -22 0 -22 C6 -22 13 -17 13 0 Z', '#7e57c2'),
  rect(-14, -8, 28, 8, 4, '#5e35b1'),
  circle(0, -24, 5, '#ede7f6'),
  ellipse(-5, -15, 3.4, 2, '#ffffff', { opacity: 0.3 }),
];
export const HAT_CROWN: Shape[] = [
  path('M-13 0 L-15 -17 L-7 -9 L0 -20 L7 -9 L15 -17 L13 0 Z', '#fbc02d'),
  rect(-13, -4, 26, 4, 1.5, '#f9a825'),
  circle(0, -9, 2, '#e53935'),
  circle(-7, -3, 1.4, '#1e88e5'),
  circle(7, -3, 1.4, '#1e88e5'),
];

/** Vêtements pendus dans l'armoire (84 × 190, repère local de l'intérieur). */
export function wardrobeInside(w: number, h: number): Shape[] {
  const colors = ['#e57373', '#64b5f6', '#f8bbd0', '#fff176', '#ba68c8', '#81c784', '#fafafa', '#ffb74d'];
  const garments: Shape[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    // les cintres restent dans la penderie (les vêtements dépassaient sur le côté de l'armoire)
    const x = 16 + (i * (w - 40)) / (n - 1);
    const c = colors[i % colors.length];
    const long = i % 3 === 1;
    garments.push(
      path(`M${x} 30 l-9 8 l3 5 l4 -2 l0 ${long ? 56 : 34} l12 0 l0 -${long ? 56 : 34} l4 2 l3 -5 Z`, c),
      path(`M${x} 30 l-9 8 l3 5 l4 -2 l0 ${long ? 56 : 34} l12 0 l0 -${long ? 56 : 34} l4 2 l3 -5 Z`, 'url(#room-h)'),
      path(`M${x} 30 v-6 q0 -3 3 -3`, 'none', { stroke: '#cfd8dc', sw: 1.4 }),
    );
  }
  return [
    rect(0, 0, w, h, 4, '#6e4526'),
    rect(3, 3, w - 6, h - 6, 3, '#8a5a35'),
    rect(3, 3, w - 6, h - 6, 3, 'url(#room-v)'),
    line(`M4 20 H${w - 4}`, '#cfd8dc', 2.6),
    ...garments,
    // étagère du bas avec piles et chaussures
    rect(3, h - 54, w - 6, 4, 0, '#a8723f'),
    rect(10, h - 70, 26, 16, 2, '#90caf9'),
    rect(10, h - 78, 26, 8, 2, '#f48fb1'),
    rect(42, h - 66, 24, 12, 2, '#ffe082'),
    ellipse(w - 24, h - 22, 12, 6, '#e57373'),
    ellipse(w - 24, h - 14, 12, 4, '#bdbdbd'),
  ];
}

/** Façade de la commode : trois tiroirs (110 × 96). */
export function drawers(w: number, h: number): Shape[] {
  const dh = (h - 12) / 3;
  return [0, 1, 2].flatMap((i) => [
    rect(5, 4 + i * (dh + 2), w - 10, dh, 3, WOOD_LIGHT),
    rect(5, 4 + i * (dh + 2), w - 10, dh, 3, 'url(#room-v)'),
    rect(w / 2 - 9, 4 + i * (dh + 2) + dh / 2 - 2, 18, 4, 2, '#8d6e63'),
  ]);
}

/** Un battant de l'armoire (largeur w, hauteur h) : bois, relief, panneau, poignée du côté du milieu. */
export function wardrobeDoor(w: number, h: number, side: 'left' | 'right'): Shape[] {
  const knob = side === 'left' ? w - 8 : 8;
  return [
    rect(0, 0, w, h, 4, WOOD_LIGHT),
    rect(0, 0, w, h, 4, 'url(#room-v)'),
    rect(8, 12, w - 16, h - 24, 3, 'none', { stroke: WOOD_DARK, sw: 2.2 }),
    circle(knob, h / 2, 3.6, '#8d6e63'),
    circle(knob - 1, h / 2 - 1, 1.3, '#d7b899'),
  ];
}

/** Bandes et serrure du coffre (95 × 34). */
export const CHEST_FRONT: Shape[] = [
  rect(14, 0, 8, 34, 0, '#c1585a'),
  rect(73, 0, 8, 34, 0, '#c1585a'),
  rect(41, 8, 13, 15, 3, '#ffd54f'),
  circle(47.5, 14, 2.2, '#8d6e63'),
];

/** Dé de « Surprise ! » : points sur la face avant (16 × 16). */
export const DIE_FRONT: Shape[] = [[4, 4], [12, 4], [8, 8], [4, 12], [12, 12]].map(([x, y]) => circle(x, y, 1.5, '#5c6bc0'));
