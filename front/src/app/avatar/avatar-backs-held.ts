/*
 * Dos (capes, ailes, sac) et objets tenus, pour le corps entier (espace 200 × 300, repères ANCHORS dans avatar-body.ts).
 * Les dos sont dessinés derrière le corps. Les objets tenus gardent leur dessin d'origine : `grip` est le point du
 * dessin (espace 200 × 200) que la main droite du personnage serre, et l'objet est posé sur ANCHORS.handR.
 */
import { Shape, ellipse, path, rect, star } from '../shared/svg/shapes';
import { ANCHORS, HEAD_SCALE_VALUE } from './avatar-body';

export const BACK_BODIES: Record<string, Shape[]> = {
  'back-cape-plain': [
    path('M64 116 L136 116 L168 268 L32 268 Z', '#3b82f6'),
    path('M64 116 L136 116 L140 132 L60 132 Z', '#2563eb'),
  ],
  'back-bat-wings': [
    path('M68 128 C42 94 18 98 8 72 C24 78 30 72 34 66 C40 84 52 84 56 76 C60 92 72 96 74 106 Z', '#37474f'),
    path('M132 128 C158 94 182 98 192 72 C176 78 170 72 166 66 C160 84 148 84 144 76 C140 92 128 96 126 106 Z', '#37474f'),
    path('M68 128 L62 98 M68 128 L40 92', 'none', { stroke: '#263238', sw: 2.5 }),
    path('M132 128 L138 98 M132 128 L160 92', 'none', { stroke: '#263238', sw: 2.5 }),
  ],
  'back-hero-cape': [
    path('M62 116 L138 116 L172 268 L28 268 Z', '#d32f2f'),
    path('M62 116 L138 116 L142 132 L58 132 Z', '#b71c1c'),
    path('M72 140 L58 266 M128 140 L142 266', 'none', { stroke: '#b71c1c', sw: 3 }),
  ],
  'back-fairy-wings': [
    ellipse(40, 132, 28, 44, '#b3e5fc', { opacity: 0.8, stroke: '#81d4fa', sw: 2 }),
    ellipse(48, 184, 17, 28, '#f8bbd0', { opacity: 0.8, stroke: '#f48fb1', sw: 2 }),
    ellipse(160, 132, 28, 44, '#b3e5fc', { opacity: 0.8, stroke: '#81d4fa', sw: 2 }),
    ellipse(152, 184, 17, 28, '#f8bbd0', { opacity: 0.8, stroke: '#f48fb1', sw: 2 }),
    star(38, 120, 6, 2.6, '#ffffff'),
    star(162, 120, 6, 2.6, '#ffffff'),
  ],
  'back-butterfly-wings': [
    ellipse(38, 132, 30, 38, '#ff9800', { stroke: '#e65100', sw: 3 }),
    ellipse(46, 184, 19, 26, '#ffb74d', { stroke: '#e65100', sw: 3 }),
    ellipse(162, 132, 30, 38, '#ff9800', { stroke: '#e65100', sw: 3 }),
    ellipse(154, 184, 19, 26, '#ffb74d', { stroke: '#e65100', sw: 3 }),
    ...[
      [34, 128, 8],
      [166, 128, 8],
      [42, 182, 5],
      [158, 182, 5],
    ].map(([x, y, r]) => ellipse(x, y, r, r, '#212121')),
  ],
  'back-backpack': [
    rect(26, 126, 36, 68, 14, '#e53935'),
    rect(138, 126, 36, 68, 14, '#e53935'),
    rect(30, 170, 28, 17, 6, '#c62828'),
    rect(142, 170, 28, 17, 6, '#c62828'),
    rect(54, 122, 9, 66, 0, '#37474f'),
    rect(137, 122, 9, 66, 0, '#37474f'),
  ],
};

/** Point de chaque objet tenu (dans son dessin d'origine, 200 × 200) que la main serre. */
export const HELD_GRIPS: Record<string, readonly [number, number]> = {
  'held-flower': [158, 186],
  'held-lantern': [160, 132],
  'held-broom': [165, 150],
  'held-candy-bucket': [160, 142],
  'held-candycane': [160, 178],
  'held-gift': [161, 176],
  'held-speculoos': [153, 170],
  'held-wand': [150, 190],
  'held-foam-sword': [167, 172],
  'held-streamers': [150, 196],
  'held-egg-basket': [162, 140],
  'held-watering-can': [124, 172],
  'held-icecream': [160, 176],
  'held-float': [130, 172],
  'held-bucket-spade': [156, 148],
  'held-big-pencil': [168, 160],
  'held-book': [160, 180],
  'held-umbrella': [160, 170],
  'held-maple-leaf': [160, 184],
  'held-hot-chocolate': [159, 181],
  'held-balloon': [158, 196],
  'held-cake': [161, 180],
};

/** Transformation qui pose l'objet tenu : son point de prise sur la paume de la main droite. */
export function heldTransform([gx, gy]: readonly [number, number]): string {
  const s = HEAD_SCALE_VALUE;
  const [hx, hy] = ANCHORS.handR;
  return `translate(${Math.round((hx - gx * s) * 10) / 10} ${Math.round((hy - gy * s) * 10) / 10}) scale(${s})`;
}
