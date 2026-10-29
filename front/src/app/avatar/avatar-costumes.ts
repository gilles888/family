/*
 * Déguisements : la partie « corps » de chaque costume, dessinée pour le corps entier (espace 200 × 300, voir
 * avatar-outfits.ts pour les repères). La partie « tête » (coiffe, `headwear`) reste dans avatar-parts-extra.ts, dans
 * l'espace de tête ; `headFront` est un calque de tête (masque, barbe, oreilles) posé avant les yeux.
 */
import { circle, ellipse, line, path, rect, star } from '../shared/svg/shapes';
import { AvatarPart } from './avatar-part-types';
import { cuffs, dots, ribCollar } from './avatar-outfits';

type Body = Pick<AvatarPart, 'shapes' | 'front' | 'under' | 'headFront' | 'garment'>;

export const COSTUME_BODIES: Record<string, Body> = {
  'costume-pyjama': {
    garment: { sleeve: 'long', top: '#90caf9', pants: '#7fb6f2' },
    shapes: [
      star(82, 146, 6.5, 3, '#fff59d'),
      star(120, 140, 5.5, 2.4, '#fff59d'),
      star(98, 166, 5, 2.2, '#fff59d'),
      star(78, 214, 6, 2.6, '#fff59d'),
      star(124, 226, 6, 2.6, '#fff59d'),
      ...cuffs('#1e88e5'),
    ],
    front: [ribCollar('#1e88e5')],
  },
  'costume-witch': {
    garment: { sleeve: 'long', bottom: 'skirt', top: '#5e35b1', pants: '#4527a0' },
    shapes: [
      rect(66, 170, 68, 8, 3, '#fbc02d'),
      rect(91, 168, 18, 12, 3, '#ffd54f'),
      rect(96, 172, 8, 4, 1, '#5e35b1'),
      ...cuffs('#311b92'),
    ],
    front: [path('M82 108 L100 128 L118 108 Z', '#311b92')],
  },
  'costume-ghost': {
    garment: { sleeve: 'none', hideBody: true },
    // le drap : de la tête au sol, bas ondulé
    shapes: [
      path(
        'M63 118 C46 150 38 210 34 262 Q44 252 54 262 Q64 252 74 262 Q84 252 94 262 Q104 252 114 262 Q124 252 134 262 Q144 252 154 262 Q160 252 166 262 C162 210 154 150 137 118 Z',
        '#fafafa',
      ),
      path('M34 262 Q44 252 54 262 Q64 252 74 262 Q84 252 94 262 Q104 252 114 262 Q124 252 134 262 Q144 252 154 262 Q160 252 166 262', 'none', { stroke: '#cfd8dc', sw: 3 }),
    ],
    front: [],
    headFront: [
      path('M48 150 C40 90 56 36 100 36 C144 36 160 90 152 150 C140 140 124 134 100 134 C76 134 60 140 48 150 Z', '#fafafa'),
      path('M48 150 C40 90 56 36 100 36 C144 36 160 90 152 150', 'none', { stroke: '#cfd8dc', sw: 3 }),
    ],
  },
  'costume-skeleton': {
    garment: { sleeve: 'long', top: '#263238', pants: '#263238' },
    shapes: [
      line('M100 122 V192', '#f5f5f5', 4),
      line('M78 140 Q100 132 122 140', '#f5f5f5', 4),
      line('M76 154 Q100 146 124 154', '#f5f5f5', 4),
      line('M74 168 Q100 160 126 168', '#f5f5f5', 4),
      line('M88 200 V272', '#f5f5f5', 4),
      line('M112 200 V272', '#f5f5f5', 4),
      circle(51, 193, 6, '#f5f5f5'),
      circle(149, 193, 6, '#f5f5f5'),
    ],
    front: [],
    headFront: [
      ellipse(100, 92, 37, 41, '#f5f5f5', { opacity: 0.92 }),
      ellipse(84, 90, 11, 12, '#212121'),
      ellipse(116, 90, 11, 12, '#212121'),
      path('M100 98 L94 110 L106 110 Z', '#212121'),
      ...[88, 94, 100, 106, 112].map((x) => line(`M${x} 116 V124`, '#212121', 2)),
    ],
  },
  'costume-pumpkin': {
    garment: { sleeve: 'long', top: '#fb8c00', pants: '#ef6c00' },
    shapes: [
      path('M82 124 Q72 156 82 192', 'none', { stroke: '#ef6c00', sw: 4 }),
      path('M100 124 V192', 'none', { stroke: '#ef6c00', sw: 4 }),
      path('M118 124 Q128 156 118 192', 'none', { stroke: '#ef6c00', sw: 4 }),
      ...cuffs('#ef6c00'),
    ],
    front: [path('M83 108 Q100 128 117 108', 'none', { stroke: '#558b2f', sw: 6 })],
  },
  'costume-vampire': {
    garment: { sleeve: 'long', top: '#212121', pants: '#212121' },
    under: [path('M60 116 C38 170 34 232 42 262 L158 262 C166 232 162 170 140 116 Z', '#b71c1c')],
    shapes: [path('M86 122 L100 192 L114 122 Z', '#fafafa'), ...cuffs('#fafafa')],
    // grand col relevé de chaque côté du cou
    front: [
      path('M84 114 L64 90 L98 110 Z', '#212121'),
      path('M116 114 L136 90 L102 110 Z', '#212121'),
      path('M84 114 L72 98 L96 111 Z', '#b71c1c'),
      path('M116 114 L128 98 L104 111 Z', '#b71c1c'),
    ],
    headFront: [path('M90 108 L94 120 L98 108 Z', '#ffffff'), path('M102 108 L106 120 L110 108 Z', '#ffffff')],
  },
  'costume-santa': {
    garment: { sleeve: 'long', top: '#d32f2f', pants: '#d32f2f' },
    shapes: [
      rect(94, 122, 12, 72, 0, '#fafafa'),
      rect(67, 176, 66, 10, 0, '#212121'),
      rect(92, 174, 16, 14, 3, '#ffd54f'),
      rect(96, 178, 8, 6, 1, '#d32f2f'),
      ...cuffs('#fafafa'),
    ],
    front: [path('M80 109 Q100 128 120 109', 'none', { stroke: '#fafafa', sw: 8 })],
    headFront: [
      path('M62 98 C58 140 142 140 138 98 C130 118 108 112 100 112 C92 112 70 118 62 98 Z', '#fafafa'),
    ],
  },
  'costume-elf': {
    garment: { sleeve: 'long', top: '#2e7d32', pants: '#c62828' },
    shapes: [
      rect(67, 174, 66, 9, 3, '#c62828'),
      rect(92, 172, 16, 13, 3, '#ffd54f'),
      ...cuffs('#c62828'),
    ],
    front: [path('M72 118 L80 107 L88 118 L96 107 L104 118 L112 107 L120 118 L128 107 L132 120 L68 120 Z', '#c62828')],
    headFront: [path('M60 90 L40 76 L60 104 Z', '$skin'), path('M140 90 L160 76 L140 104 Z', '$skin')],
  },
  'costume-tree': {
    garment: { sleeve: 'none', hideBody: true },
    shapes: [
      path('M34 272 L100 122 L166 272 Z', '#2e7d32'),
      path('M56 272 L100 160 L144 272 Z', '#388e3c'),
      ...dots([[72, 244], [130, 250], [100, 196], [114, 266], [86, 218], [118, 226]], 5, '#e53935'),
      ...dots([[130, 250], [86, 262]], 5, '#ffca28'),
      ...dots([[112, 210], [76, 238]], 4, '#42a5f5'),
    ],
    front: [],
  },
  'costume-snowman': {
    garment: { sleeve: 'none', hideBody: true },
    shapes: [
      circle(100, 240, 48, '#fafafa', { stroke: '#cfd8dc', sw: 3 }),
      circle(100, 166, 38, '#fafafa', { stroke: '#cfd8dc', sw: 3 }),
      ...dots([[100, 150], [100, 168], [100, 186]], 4.5, '#37474f'),
      line('M64 160 L28 136 M44 147 L34 128', '#6d4c41', 4),
      line('M136 160 L172 136 M156 147 L166 128', '#6d4c41', 4),
    ],
    front: [
      path('M72 116 C86 130 114 130 128 116 L130 128 C114 142 86 142 70 128 Z', '#e53935'),
      path('M116 128 L126 158 L114 160 L108 134 Z', '#e53935'),
    ],
    headFront: [path('M100 98 L130 105 L100 110 Z', '#fb8c00')],
  },
  'costume-clown': {
    garment: { sleeve: 'long', top: '#fdd835', pants: '#e53935' },
    shapes: [
      ...dots([[80, 142], [120, 152], [96, 168], [76, 178], [122, 186]], 5.5, '#e53935'),
      ...dots([[88, 150], [112, 140], [100, 184]], 5, '#1e88e5'),
      ...dots([[80, 214], [120, 220], [100, 236]], 5, '#fdd835'),
      ...dots([[51, 184], [149, 184]], 7, '#fafafa'),
    ],
    front: [
      ...[78, 89, 100, 111, 122].map((x, i) => circle(x, 114 + (i % 2) * 2, 8, i % 2 ? '#fafafa' : '#e53935')),
    ],
  },
  'costume-pirate': {
    garment: { sleeve: 'long', top: '#fafafa', pants: '#37474f' },
    shapes: [
      ...[134, 148, 162, 176].map((y) => rect(66, y, 68, 5, 0, '#1565c0')),
      path('M72 118 L90 124 L84 194 L68 194 Z', '#4e342e'),
      path('M128 118 L110 124 L116 194 L132 194 Z', '#4e342e'),
      ...dots([[80, 160], [120, 160]], 3, '#ffd54f'),
      rect(67, 186, 66, 6, 3, '#6d4c41'),
      ...cuffs('#fafafa'),
    ],
    front: [path('M84 109 L100 128 L116 109 Z', '#fafafa')],
  },
  'costume-knight': {
    garment: { sleeve: 'long', top: '#b0bec5', pants: '#90a4ae' },
    shapes: [
      line('M100 122 V192', '#78909c', 3),
      line('M70 150 H130', '#78909c', 3),
      line('M68 170 H132', '#78909c', 3),
      circle(65, 126, 13, '#cfd8dc', { stroke: '#78909c', sw: 3 }),
      circle(135, 126, 13, '#cfd8dc', { stroke: '#78909c', sw: 3 }),
      ...cuffs('#78909c'),
    ],
    front: [path('M78 108 Q100 130 122 108 L122 118 Q100 140 78 118 Z', '#90a4ae')],
  },
  'costume-princess': {
    garment: { sleeve: 'short', bottom: 'skirt', top: '#f48fb1' },
    // la grande robe : jupe évasée jusqu'au sol, panneau clair, étoiles
    shapes: [
      path('M62 176 C52 214 38 250 28 272 Q100 290 172 272 C162 250 148 214 138 176 Z', '#f48fb1'),
      path('M84 200 C86 236 82 260 74 276 Q100 284 126 276 C118 260 114 236 116 200 Z', '#f8bbd0'),
      star(46, 258, 6, 2.6, '#fff8e1'),
      star(154, 258, 6, 2.6, '#fff8e1'),
      star(100, 266, 6, 2.6, '#fff8e1'),
      rect(67, 170, 66, 7, 3, '#ec407a'),
    ],
    front: [...[76, 88, 100, 112, 124].map((x) => circle(x, 112, 5.5, '#fafafa'))],
  },
  'costume-hero': {
    garment: { sleeve: 'long', top: '#1e88e5', pants: '#1565c0' },
    shapes: [
      rect(67, 188, 66, 8, 3, '#d32f2f'),
      rect(91, 187, 18, 10, 3, '#ffd54f'),
      circle(100, 148, 14, '#ffd54f'),
      star(100, 148.5, 10, 4.5, '#d32f2f'),
      ...cuffs('#d32f2f'),
    ],
    front: [path('M82 108 L100 128 L118 108 Z', '#d32f2f')],
  },
  'costume-dino': {
    garment: { sleeve: 'long', top: '#43a047', pants: '#43a047' },
    under: [path('M118 214 Q168 222 178 262 Q150 250 124 244 Z', '#43a047')],
    shapes: [ellipse(100, 160, 26, 24, '#c5e1a5'), ...dots([[47, 192], [153, 192]], 4, '#ff8f00'), ...cuffs('#2e7d32')],
    front: [ribCollar('#2e7d32')],
  },
  'costume-unicorn': {
    garment: { sleeve: 'short', top: '#fafafa', pants: '#fafafa' },
    under: [
      path('M132 190 C172 198 178 240 162 268 L148 264 C158 240 152 214 132 206 Z', '#f48fb1'),
      path('M142 200 C166 214 168 244 156 262', 'none', { stroke: '#81d4fa', sw: 5 }),
      path('M148 196 C172 210 172 246 160 264', 'none', { stroke: '#fff176', sw: 4 }),
    ],
    shapes: [
      path('M70 150 Q100 142 130 150', 'none', { stroke: '#f48fb1', sw: 4 }),
      path('M69 160 Q100 152 131 160', 'none', { stroke: '#81d4fa', sw: 4 }),
      path('M69 170 Q100 162 131 170', 'none', { stroke: '#fff176', sw: 4 }),
    ],
    front: [ribCollar('#f48fb1')],
  },
  'costume-bunny': {
    garment: { sleeve: 'long', top: '#f5f5f5', pants: '#f5f5f5' },
    under: [circle(140, 222, 13, '#fafafa')],
    shapes: [ellipse(100, 160, 22, 24, '#f8bbd0'), ...cuffs('#f8bbd0')],
    front: [ribCollar('#f48fb1')],
    headFront: [
      ...[0, 1].map((i) => line(`M${72 - i * 6} ${108 + i * 6} L${52 - i * 6} ${106 + i * 12}`, '#bdbdbd', 1.5)),
      ...[0, 1].map((i) => line(`M${128 + i * 6} ${108 + i * 6} L${148 + i * 6} ${106 + i * 12}`, '#bdbdbd', 1.5)),
      path('M96 100 L104 100 L100 106 Z', '#f48fb1'),
    ],
  },
  'costume-astronaut': {
    garment: { sleeve: 'long', top: '#eceff1', pants: '#eceff1' },
    shapes: [
      rect(78, 134, 44, 26, 6, '#cfd8dc'),
      ...dots([[90, 147]], 5, '#e53935'),
      ...dots([[110, 147]], 5, '#1e88e5'),
      circle(66, 152, 7, '#1e88e5'),
      rect(67, 188, 66, 6, 3, '#b0bec5'),
      ...cuffs('#b0bec5'),
    ],
    front: [path('M70 112 Q100 130 130 112', 'none', { stroke: '#b0bec5', sw: 8 })],
  },
  'costume-firefighter': {
    garment: { sleeve: 'long', top: '#d32f2f', pants: '#263238' },
    shapes: [
      rect(66, 150, 68, 8, 0, '#fdd835'),
      rect(68, 170, 64, 8, 0, '#fdd835'),
      rect(67, 188, 66, 6, 3, '#fdd835'),
      ...cuffs('#fdd835'),
    ],
    front: [path('M82 110 L100 130 L118 110 Z', '#b71c1c')],
  },
  'costume-doctor': {
    garment: { sleeve: 'long', top: '#fafafa', pants: '#80cbc4' },
    shapes: [
      path('M88 122 L100 192 L112 122 Z', '#80cbc4'),
      path('M76 122 C64 164 100 176 100 158', 'none', { stroke: '#607d8b', sw: 3.5 }),
      circle(100, 160, 5, '#90a4ae'),
      rect(112, 152, 14, 14, 2, '#eceff1', { stroke: '#cfd8dc', sw: 1.5 }),
    ],
    front: [path('M84 109 L70 126 L92 130 Z', '#eceff1'), path('M116 109 L130 126 L108 130 Z', '#eceff1')],
  },
  'costume-chef': {
    garment: { sleeve: 'long', top: '#fafafa', pants: '#455a64' },
    shapes: [
      ...dots([[91, 138], [91, 156], [91, 174], [109, 138], [109, 156], [109, 174]], 3.2, '#90a4ae'),
      line('M100 124 V192', '#cfd8dc', 2),
      ...cuffs('#eceff1'),
    ],
    front: [path('M78 109 Q100 128 122 109 L118 120 Q100 135 82 120 Z', '#e53935')],
  },
  'costume-football': {
    garment: { sleeve: 'short', bottom: 'shorts', top: '#1565c0', pants: '#fafafa' },
    shapes: [
      rect(75, 128, 7, 60, 0, '#fafafa'),
      rect(118, 128, 7, 60, 0, '#fafafa'),
      path('M95 152 L101 147 V172', 'none', { stroke: '#fafafa', sw: 4 }),
      // chaussettes montantes
      rect(76, 246, 20, 28, 4, '#1565c0'),
      rect(104, 246, 20, 28, 4, '#1565c0'),
      rect(76, 250, 20, 4, 0, '#fafafa'),
      rect(104, 250, 20, 4, 0, '#fafafa'),
    ],
    front: [ribCollar('#fafafa')],
  },
};

