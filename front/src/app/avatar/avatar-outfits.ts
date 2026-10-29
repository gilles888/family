/*
 * Habits, dessinés pour le corps entier (espace 200 × 300, repères ANCHORS dans avatar-body.ts). Le corps de base fournit
 * déjà le haut (couleur de la tenue), les manches, le bas et les chaussures selon `garment` ; ici, les détails : cols,
 * rayures, boutons, poches, capes. Torse : x 63→137 aux épaules (y 123), 71→129 à la taille (y 174), 67→133 aux hanches
 * (y 194) ; encolure en y ≈ 108 ; poignets vers (52, 187) et (148, 187).
 * Couleurs : `$c` tenue, `$d` plus foncé, `$dd` encore plus foncé, `$l` plus clair, `$skin` teint ; ou fixes.
 */
import { circle, line, path, rect, star } from '../shared/svg/shapes';
import { AvatarPart } from './avatar-part-types';

/** Rangée de points (boutons, pois). */
const dots = (pts: number[][], r: number, fill: string, opacity = 1) =>
  pts.map(([x, y]) => circle(x, y, r, fill, { opacity }));
/** Poignets (revers) : un trait en travers de chaque manche longue. */
const cuffs = (color: string) => [
  line('M45 182 L59 183', color, 5),
  line('M141 183 L155 182', color, 5),
];
/** Encolure ronde en côte, par-dessus l'encolure du corps. */
const ribCollar = (color: string) =>
  path('M83 108 Q100 127 117 108', 'none', { stroke: color, sw: 5 });

export const OUTFITS: AvatarPart[] = [
  {
    id: 'outfit-tshirt',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.tshirt:T-shirt`,
    garment: { sleeve: 'short' },
    shapes: [],
    front: [ribCollar('$d')],
  },
  {
    id: 'outfit-sweater',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.sweater:Pull`,
    garment: { sleeve: 'long' },
    shapes: [
      line('M66 142 H134', '$l', 5, { opacity: 0.55 }),
      line('M67 156 H133', '$l', 5, { opacity: 0.55 }),
      line('M69 170 H131', '$l', 5, { opacity: 0.55 }),
      rect(67, 187, 66, 8, 3, '$d'),
      ...cuffs('$d'),
    ],
    front: [ribCollar('$d')],
  },
  {
    id: 'outfit-hoodie',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.hoodie:Sweat à capuche`,
    garment: { sleeve: 'long' },
    // la capuche, derrière la tête et les épaules
    under: [path('M64 126 C58 98 78 88 100 88 C122 88 142 98 136 126 Z', '$d')],
    shapes: [
      path('M76 168 H124 L130 190 H70 Z', '$d', { opacity: 0.8 }),
      line('M100 170 V190', '$dd', 1.5, { opacity: 0.5 }),
      ...cuffs('$d'),
    ],
    front: [
      path('M82 108 C88 128 112 128 118 108 C112 118 88 118 82 108 Z', '$d'),
      line('M93 121 L91 142', '#ffffff', 2.5),
      line('M107 121 L109 142', '#ffffff', 2.5),
    ],
  },
  {
    id: 'outfit-shirt',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.shirt:Chemise`,
    garment: { sleeve: 'long' },
    shapes: [
      line('M100 122 V193', '$d', 2),
      ...dots([[100, 136], [100, 152], [100, 168], [100, 184]], 2.4, '$dd'),
      ...cuffs('#ffffff'),
    ],
    front: [
      path('M100 123 L84 108 L79 125 Z', '#ffffff'),
      path('M100 123 L116 108 L121 125 Z', '#ffffff'),
    ],
  },
  {
    id: 'outfit-dress',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.dress:Robe`,
    garment: { sleeve: 'none', bottom: 'skirt' },
    shapes: [
      rect(66, 169, 68, 7, 3, '$dd'),
      ...dots([[82, 146], [100, 138], [118, 146], [84, 200], [116, 200], [100, 214], [72, 224], [128, 224], [100, 230]], 3, '#ffffff', 0.6),
    ],
    // encolure en cœur sur le teint, bretelles
    front: [path('M84 109 Q100 131 116 109 Z', '$skin')],
  },
  {
    id: 'outfit-overalls',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.overalls:Salopette`,
    garment: { sleeve: 'short', top: '#eceff1', pants: '$c' },
    shapes: [
      rect(78, 150, 44, 46, 6, '$c'),
      line('M81 152 L72 122', '$c', 7),
      line('M119 152 L128 122', '$c', 7),
      ...dots([[81, 153], [119, 153]], 3.5, '#fbbf24'),
      rect(90, 166, 20, 14, 4, '$d'),
    ],
    front: [],
  },
  {
    id: 'outfit-jersey',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.jersey:Maillot de sport`,
    garment: { sleeve: 'short', bottom: 'shorts', pants: '$dd' },
    shapes: [
      line('M67 128 L71 190', '#ffffff', 4),
      line('M133 128 L129 190', '#ffffff', 4),
      path('M93 150 L102 143 V170', 'none', { stroke: '#ffffff', sw: 5 }),
    ],
    front: [
      path('M85 108 L100 128 L115 108 Z', '#ffffff'),
      path('M85 108 L100 128 L115 108', 'none', { stroke: '$d', sw: 2.5 }),
    ],
  },
  {
    id: 'outfit-hero',
    slot: 'body',
    space: 'body',
    label: $localize`:@@avatar.outfit.hero:Costume de super-héros`,
    garment: { sleeve: 'long', pants: '$dd' },
    // la cape, derrière le corps
    under: [path('M62 118 C42 170 38 232 46 262 L154 262 C162 232 158 170 138 118 Z', '$dd')],
    shapes: [
      circle(100, 148, 13, '#ffffff'),
      star(100, 148.5, 9, 4, '$c'),
      rect(67, 188, 66, 6, 3, '#fbbf24'),
      ...cuffs('#fbbf24'),
    ],
    front: [],
  },
];

export const EXTRA_OUTFITS: AvatarPart[] = [
  {
    id: 'outfit-xmas-sweater',
    slot: 'body',
    space: 'body',
    theme: 'noel',
    rarete: 'rare',
    label: $localize`:@@avatar.outfit.xmasSweater:Pull de Noël`,
    garment: { sleeve: 'long', top: '#c62828' },
    shapes: [
      rect(67, 187, 66, 8, 3, '#fafafa'),
      path('M76 172 L84 156 L92 172 Z M108 172 L116 156 L124 172 Z', '#2e7d32'),
      ...dots([[84, 140], [116, 140], [100, 150], [100, 178]], 3, '#fdd835'),
      ...cuffs('#fafafa'),
    ],
    front: [ribCollar('#fafafa')],
  },
  {
    id: 'outfit-swimsuit',
    slot: 'body',
    space: 'body',
    theme: 'ete',
    rarete: 'commun',
    label: $localize`:@@avatar.outfit.swimsuit:Maillot de bain`,
    garment: { sleeve: 'none', bottom: 'shorts', top: '#26c6da', pants: '#26c6da' },
    shapes: [...dots([[86, 150], [100, 144], [114, 150], [100, 168]], 3, '#fafafa')],
    front: [path('M84 109 Q100 129 116 109 Z', '$skin')],
  },
  {
    id: 'outfit-hawaii',
    slot: 'body',
    space: 'body',
    theme: 'ete',
    rarete: 'commun',
    label: $localize`:@@avatar.outfit.hawaii:Chemise hawaïenne`,
    garment: { sleeve: 'short', bottom: 'shorts', top: '#26a69a', pants: '#fff3c4' },
    shapes: [
      ...dots([[76, 140], [124, 152], [82, 170], [118, 182], [96, 156]], 6, '#f06292'),
      ...dots([[112, 136], [78, 156], [100, 186]], 4.5, '#fff176'),
      line('M100 122 V194', '#00897b', 2),
    ],
    front: [
      path('M100 123 L84 108 L79 125 Z', '#80cbc4'),
      path('M100 123 L116 108 L121 125 Z', '#80cbc4'),
    ],
  },
  {
    id: 'outfit-raincoat',
    slot: 'body',
    space: 'body',
    theme: 'automne',
    rarete: 'commun',
    label: $localize`:@@avatar.outfit.raincoat:Imperméable`,
    garment: { sleeve: 'long', top: '#fdd835', pants: '#546e7a' },
    shapes: [
      line('M100 122 V194', '#f9a825', 3),
      ...dots([[92, 140], [92, 158], [92, 176]], 3.5, '#37474f'),
      rect(72, 168, 18, 5, 2, '#f9a825'),
      rect(110, 168, 18, 5, 2, '#f9a825'),
      ...cuffs('#f9a825'),
    ],
    front: [path('M80 108 Q100 130 120 108 L128 123 Q100 146 72 123 Z', '#f9a825')],
  },
  {
    id: 'outfit-puffer',
    slot: 'body',
    space: 'body',
    theme: 'hiver',
    rarete: 'commun',
    label: $localize`:@@avatar.outfit.puffer:Doudoune`,
    garment: { sleeve: 'long', top: '#1e88e5' },
    shapes: [
      ...[140, 156, 172, 188].map((y) =>
        path(`M66 ${y} Q100 ${y - 7} 134 ${y}`, 'none', { stroke: '#1565c0', sw: 3 }),
      ),
      line('M100 122 V194', '#0d47a1', 3),
      ...cuffs('#1565c0'),
    ],
    front: [rect(80, 104, 40, 16, 8, '#1565c0')],
  },
];
