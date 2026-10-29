import { Shape, circle, ellipse, line, path, rect, star } from '../shared/svg/shapes';

/**
 * Décor de la chambre : dessins SVG dans le style des personnages (traits doux, pastels), construits avec
 * shapes.ts. Un seul viewBox fixe ; la scène s'adapte à l'écran. Les meubles sont découpés en « calques » (portes,
 * tiroirs…) pour pouvoir s'ouvrir par CSS.
 */
export const ROOM_W = 1000;
export const ROOM_H = 600;
export const ROOM_VIEWBOX = `0 0 ${ROOM_W} ${ROOM_H}`;

export type FurnitureId = 'armoire' | 'commode' | 'chapeaux' | 'coiffeuse' | 'coffre' | 'fenetre' | 'tirelire' | 'boutique';

/** Rectangle [x, y, largeur, hauteur] cliquable de chaque meuble, dans le viewBox de la pièce. */
export const FURNITURE_RECT: Record<FurnitureId | 'de' | 'livre', readonly [number, number, number, number]> = {
  armoire: [30, 118, 200, 364],
  commode: [245, 300, 170, 172],
  chapeaux: [250, 96, 150, 130],
  fenetre: [430, 46, 190, 226],
  coiffeuse: [655, 140, 160, 335],
  coffre: [836, 404, 146, 92],
  tirelire: [662, 46, 82, 66],
  boutique: [850, 148, 112, 256],
  de: [338, 252, 52, 48],
  livre: [774, 54, 72, 58],
};

/** Position du personnage entier dans la pièce (largeur ; la hauteur fait 1,5 fois la largeur). */
export const CHARACTER = { x: 385, y: 225, size: 230 } as const;

const WOOD = '#d9ab70';
const WOOD_DARK = '#c08d52';
const WOOD_LIGHT = '#e8c490';

// ---------- fond : mur, parquet, tapis

export const WALL: Shape[] = [
  rect(0, 0, ROOM_W, 404, 0, '#fde8d8'),
  ...Array.from({ length: 17 }, (_, i) => rect(i * 62 + 8, 0, 14, 404, 0, '#fbd9c3', { opacity: 0.55 })),
  rect(0, 392, ROOM_W, 16, 0, '#f5cfae'),
];

export const FLOOR: Shape[] = [
  rect(0, 404, ROOM_W, 196, 0, '#ecd0a6'),
  ...[444, 486, 530, 572].map((y) => line(`M0 ${y} H${ROOM_W}`, '#d9b88a', 3)),
  ...[0, 1, 2, 3].flatMap((row) =>
    Array.from({ length: 9 }, (_, i) => line(`M${i * 120 + (row % 2) * 60 + 30} ${404 + row * 44} v${row < 3 ? 40 : 28}`, '#d9b88a', 2.5)),
  ),
];

export const RUG: Shape[] = [
  ellipse(500, 548, 312, 44, '#f8bbd0'),
  ellipse(500, 548, 276, 34, '#f48fb1', { opacity: 0.55 }),
  ellipse(500, 548, 236, 26, 'none', { stroke: '#ffffff', sw: 4, opacity: 0.8 }),
];

/** Ombre sous les pieds du personnage. */
export const SHADOW: Shape[] = [ellipse(500, 528, 96, 12, '#7a2e3a', { opacity: 0.18 })];

/** Jambes et chaussures sous le buste (le buste s'arrête à la taille). */
export const LEGS: Shape[] = [
  rect(446, 430, 44, 90, 14, '#5c6bc0'),
  rect(510, 430, 44, 90, 14, '#5c6bc0'),
  ellipse(466, 522, 34, 12, '#fafafa', { stroke: '#cfd8dc', sw: 2 }),
  ellipse(534, 522, 34, 12, '#fafafa', { stroke: '#cfd8dc', sw: 2 }),
];

// ---------- fenêtre (le ciel est dessiné par la scène : c'est le fond choisi dans la garde-robe)

export const WINDOW_SKY_RECT = [440, 56, 170, 192] as const;

export const WINDOW_FRAME: Shape[] = [
  rect(430, 46, 190, 212, 10, 'none', { stroke: '#ffffff', sw: 12 }),
  line('M525 56 V248', '#ffffff', 8),
  line('M440 152 H610', '#ffffff', 8),
  rect(418, 256, 214, 16, 6, '#ffffff', { stroke: '#e0d4c8', sw: 2 }),
];

/** Rideaux (deux pans qui s'écartent à l'ouverture). */
export const CURTAIN_LEFT: Shape[] = [path('M428 38 H500 Q486 130 492 250 L428 252 Z', '#f8bbd0'), path('M452 40 Q450 140 456 250', 'none', { stroke: '#f48fb1', sw: 3, opacity: 0.7 })];
export const CURTAIN_RIGHT: Shape[] = [path('M622 38 H550 Q564 130 558 250 L622 252 Z', '#f8bbd0'), path('M598 40 Q600 140 594 250', 'none', { stroke: '#f48fb1', sw: 3, opacity: 0.7 })];
export const CURTAIN_ROD: Shape[] = [line('M416 36 H634', '#8d6e63', 6), circle(414, 36, 7, '#8d6e63'), circle(636, 36, 7, '#8d6e63')];

// ---------- armoire à deux portes

export const ARMOIRE_BODY: Shape[] = [
  rect(36, 478, 22, 14, 4, WOOD_DARK),
  rect(192, 478, 22, 14, 4, WOOD_DARK),
  rect(30, 130, 190, 352, 12, WOOD),
  rect(22, 114, 206, 24, 8, WOOD_DARK),
];
/** Intérieur, visible quand les portes s'écartent. */
export const ARMOIRE_INSIDE: Shape[] = [rect(40, 150, 170, 316, 6, '#a9794a'), line('M44 190 H206', '#8d6e63', 6)];
export const ARMOIRE_DOOR_LEFT: Shape[] = [
  rect(38, 148, 84, 320, 8, WOOD_LIGHT),
  rect(50, 162, 60, 292, 6, 'none', { stroke: WOOD_DARK, sw: 3 }),
  circle(112, 316, 6, '#8d6e63'),
];
export const ARMOIRE_DOOR_RIGHT: Shape[] = [
  rect(128, 148, 84, 320, 8, WOOD_LIGHT),
  rect(140, 162, 60, 292, 6, 'none', { stroke: WOOD_DARK, sw: 3 }),
  circle(138, 316, 6, '#8d6e63'),
];

// ---------- commode à trois tiroirs (et dé de « Surprise ! » posé dessus)

export const COMMODE_BODY: Shape[] = [rect(252, 464, 20, 12, 4, WOOD_DARK), rect(388, 464, 20, 12, 4, WOOD_DARK), rect(246, 330, 168, 140, 10, WOOD), rect(238, 320, 184, 16, 7, WOOD_DARK)];
/** Tiroirs de haut en bas ; chacun sort vers l'avant. */
export const COMMODE_DRAWERS: Shape[][] = [0, 1, 2].map((i) => [
  rect(256, 344 + i * 41, 148, 34, 6, WOOD_LIGHT),
  rect(317, 356 + i * 41, 26, 8, 4, '#8d6e63'),
]);

export const DICE: Shape[] = [
  rect(342, 276, 40, 40, 8, '#ffffff', { stroke: '#cfd8dc', sw: 2 }),
  ...[[352, 286], [372, 306], [362, 296], [372, 286], [352, 306]].map(([x, y]) => circle(x, y, 3.4, '#5c6bc0')),
];

// ---------- étagère à chapeaux murale (au-dessus de la commode)

export const HAT_RACK: Shape[] = [
  rect(252, 190, 146, 14, 6, WOOD_DARK),
  ...[284, 325, 366].map((x) => rect(x - 4, 196, 8, 22, 4, '#8d6e63')),
  // chapeaux suspendus
  path('M268 190 C268 160 290 150 306 150 C322 150 340 160 340 190 Z', '#e53935'),
  rect(262, 184, 84, 8, 4, '#b71c1c'),
  path('M352 190 C352 164 366 156 380 156 C394 156 392 168 394 190 Z', '#7e57c2'),
  circle(380, 150, 8, '#ede7f6'),
  path('M262 142 L266 118 L282 130 L292 112 L302 130 L318 118 L322 142 Z', '#fbc02d'),
];

// ---------- coiffeuse (table, tabouret, miroir)

export const VANITY: Shape[] = [
  rect(668, 420, 14, 56, 4, WOOD_DARK),
  rect(790, 420, 14, 56, 4, WOOD_DARK),
  rect(660, 392, 150, 34, 8, WOOD),
  rect(652, 380, 166, 16, 7, WOOD_DARK),
  rect(700, 424, 70, 30, 6, WOOD_LIGHT),
  rect(729, 436, 14, 6, 3, '#8d6e63'),
  // flacons et brosse
  rect(676, 352, 14, 28, 5, '#f48fb1'),
  rect(698, 360, 12, 20, 4, '#81d4fa'),
  circle(792, 372, 8, '#fff59d'),
  line('M760 378 L768 354', '#8d6e63', 5),
  ellipse(770, 350, 7, 5, '#f8bbd0'),
];
export const MIRROR: Shape[] = [
  ellipse(736, 252, 66, 92, WOOD_DARK),
  ellipse(736, 252, 58, 84, '#d6f1fc'),
  path('M702 214 Q718 190 738 184', 'none', { stroke: '#ffffff', sw: 7, opacity: 0.9 }),
  path('M698 240 Q706 226 714 218', 'none', { stroke: '#ffffff', sw: 4, opacity: 0.7 }),
  rect(726, 342, 20, 40, 4, WOOD_DARK),
];

// ---------- étagère de droite : tirelire cochon et livre

export const SHELF: Shape[] = [rect(650, 112, 312, 12, 5, WOOD_DARK), path('M668 124 v18 h12 v-18 Z M930 124 v18 h12 v-18 Z', '#8d6e63')];

export const PIG: Shape[] = [
  ellipse(705, 90, 34, 24, '#f8bbd0'),
  path('M680 72 L676 58 L692 66 Z', '#f48fb1'),
  path('M708 66 L716 54 L722 70 Z', '#f48fb1'),
  ellipse(734, 94, 11, 9, '#f48fb1'),
  circle(731, 94, 2, '#c2185b'),
  circle(738, 94, 2, '#c2185b'),
  circle(724, 82, 3.2, '#3e2723'),
  rect(688, 104, 9, 10, 3, '#f48fb1'),
  rect(712, 104, 9, 10, 3, '#f48fb1'),
  path('M672 88 q-10 -4 -6 -12', 'none', { stroke: '#f48fb1', sw: 4 }),
  rect(700, 64, 14, 4, 2, '#c2185b'),
  circle(740, 56, 8, '#ffd54f', { stroke: '#f9a825', sw: 2 }),
];

export const BOOK: Shape[] = [
  rect(780, 72, 16, 40, 3, '#7e57c2'),
  rect(798, 78, 14, 34, 3, '#26a69a'),
  path('M818 112 L826 76 L840 80 L832 114 Z', '#ef5350'),
  star(788, 92, 5, 2.2, '#ffd54f'),
];

// ---------- porte de la boutique

export const SHOP_DOOR: Shape[] = [
  rect(846, 144, 120, 262, 8, '#b2dfdb', { stroke: '#80cbc4', sw: 5 }),
  rect(860, 160, 92, 228, 6, '#80cbc4'),
  rect(868, 172, 76, 90, 6, 'none', { stroke: '#e0f2f1', sw: 3 }),
  circle(938, 290, 6, '#ffd54f'),
  // enseigne : une pièce d'or
  circle(906, 120, 20, '#ffd54f', { stroke: '#f9a825', sw: 3 }),
  circle(906, 120, 12, 'none', { stroke: '#f9a825', sw: 2 }),
  star(906, 120, 8, 3.5, '#f9a825'),
];
/** Bande de lumière quand la porte s'entrouvre. */
export const SHOP_LIGHT: Shape[] = [rect(860, 160, 22, 228, 4, '#fff9c4', { opacity: 0.95 })];

// ---------- coffre à jouets

export const CHEST_BODY: Shape[] = [rect(846, 440, 130, 54, 8, '#ef9a9a', { stroke: '#e57373', sw: 3 }), rect(846, 462, 130, 10, 0, '#e57373'), rect(902, 452, 18, 22, 4, '#ffd54f')];
export const CHEST_LID: Shape[] = [path('M842 440 Q842 410 876 408 H946 Q980 410 980 440 Z', '#e57373', { stroke: '#ef5350', sw: 3 }), rect(842, 436, 138, 8, 3, '#ef5350')];

// ---------- décors de thème (étape 5) : désactivés par défaut, voir room-theme-art.ts

/** Quelques pièces d'art pour le test unitaire : tous les groupes de formes de la scène. */
export const ALL_STATIC: Shape[][] = [WALL, FLOOR, RUG, WINDOW_FRAME, ARMOIRE_BODY, COMMODE_BODY, HAT_RACK, VANITY, MIRROR, SHELF, PIG, BOOK, SHOP_DOOR, CHEST_BODY, DICE];
