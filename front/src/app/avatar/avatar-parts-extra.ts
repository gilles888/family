/*
 * Pièces ajoutées en version 2 : déguisements, maquillages et masques, dos (capes, ailes), objets tenus, ainsi que des
 * habits, chapeaux, coiffures et fonds supplémentaires, dont beaucoup liés aux thèmes de l'application.
 * Même règles que avatar-parts.ts : ids stables, dessins dans le viewBox 0 0 200 200, couleurs fixes (sauf `$skin`).
 * Rareté : fixe le prix par défaut (barème de boutique/catalogue.json côté serveur).
 */
import { INK, Shape, circle, ellipse, line, path, rect, star } from '../shared/svg/shapes';
import { AvatarPart, GradientOption } from './avatar-part-types';
import { COSTUME_BODIES } from './avatar-costumes';

const TORSO = 'M34 200 C36 168 60 150 100 150 C140 150 164 168 166 200 Z';
const WIDE = 'M22 200 C28 168 56 150 100 150 C144 150 172 168 178 200 Z';
const torso = (fill: string): Shape => path(TORSO, fill);
/** Dessus de tête commun (même tracé que HAIR_CAP de avatar-parts.ts). */
const HAIR_CAP_X =
  'M58 86 C56 56 76 42 100 42 C124 42 144 56 142 86 C134 72 120 62 100 62 C84 62 70 70 58 86 Z';
/** Pompon / boule. */
const dot = (x: number, y: number, r: number, fill: string): Shape => circle(x, y, r, fill);
/** Rangée de points régulière (boutons, pois). */
const row = (xs: number[], y: number, r: number, fill: string): Shape[] =>
  xs.map((x) => circle(x, y, r, fill));

// =====================================================================================================================
// Déguisements
// =====================================================================================================================

/** Déguisements : identité et coiffe ; la partie corps est dans avatar-costumes.ts. */
const COSTUME_HEADS: AvatarPart[] = [
  {
    id: 'costume-pyjama',
    slot: 'costume',
    free: true,
    label: $localize`:@@avatar.costume.pyjama:Pyjama étoilé`,
    shapes: [],
  },
  // ---- Halloween
  {
    id: 'costume-witch',
    slot: 'costume',
    theme: 'halloween',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.witch:Sorcière`,
    shapes: [],
    headwear: [
      ellipse(100, 62, 54, 10, '#1a1a2e'),
      path('M68 62 C80 50 88 30 104 2 C108 30 120 50 132 62 Z', '#1a1a2e'),
      rect(76, 52, 48, 8, 2, '#7e57c2'),
      rect(94, 50, 12, 12, 2, '#ffd54f'),
      rect(97, 53, 6, 6, 1, '#1a1a2e'),
    ],
  },
  {
    id: 'costume-ghost',
    slot: 'costume',
    theme: 'halloween',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.ghost:Fantôme`,
    shapes: [],
  },
  {
    id: 'costume-skeleton',
    slot: 'costume',
    theme: 'halloween',
    rarete: 'super',
    label: $localize`:@@avatar.costume.skeleton:Squelette`,
    shapes: [],
  },
  {
    id: 'costume-pumpkin',
    slot: 'costume',
    theme: 'halloween',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.pumpkin:Citrouille`,
    shapes: [],
    headwear: [
      path(
        'M54 80 C52 44 76 30 100 30 C124 30 148 44 146 80 C134 68 118 64 100 64 C82 64 66 68 54 80 Z',
        '#fb8c00',
      ),
      path('M100 32 V62', 'none', { stroke: '#ef6c00', sw: 4 }),
      path('M96 32 Q96 14 112 10 L114 20 Q104 22 104 32 Z', '#558b2f'),
    ],
  },
  {
    id: 'costume-vampire',
    slot: 'costume',
    theme: 'halloween',
    rarete: 'super',
    label: $localize`:@@avatar.costume.vampire:Vampire`,
    shapes: [],
  },
  // ---- Noël
  {
    id: 'costume-santa',
    slot: 'costume',
    theme: 'noel',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.santa:Père Noël`,
    shapes: [],
    headwear: [
      path(
        'M56 74 C56 44 74 30 100 30 C126 30 144 46 160 74 L148 78 C140 66 124 62 100 62 C82 62 66 66 56 74 Z',
        '#d32f2f',
      ),
      rect(54, 66, 92, 14, 7, '#fafafa'),
      dot(158, 74, 9, '#fafafa'),
    ],
  },
  {
    id: 'costume-elf',
    slot: 'costume',
    theme: 'noel',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.elf:Lutin`,
    shapes: [],
    headwear: [
      path(
        'M56 74 C56 46 76 36 100 36 C124 36 144 46 144 74 C132 62 118 60 100 60 C82 60 68 62 56 74 Z',
        '#2e7d32',
      ),
      path('M120 40 C140 20 156 24 164 46', 'none', { stroke: '#2e7d32', sw: 10 }),
      dot(164, 50, 6, '#ffd54f'),
      rect(54, 66, 92, 10, 5, '#c62828'),
    ],
  },
  {
    id: 'costume-tree',
    slot: 'costume',
    theme: 'noel',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.tree:Sapin`,
    shapes: [],
    headwear: [
      path(
        'M54 82 C54 50 74 36 100 8 C126 36 146 50 146 82 C134 70 118 66 100 66 C82 66 66 70 54 82 Z',
        '#2e7d32',
      ),
      star(100, 12, 13, 6, '#ffca28'),
      dot(76, 62, 4, '#e53935'),
      dot(124, 56, 4, '#ffca28'),
    ],
  },
  {
    id: 'costume-snowman',
    slot: 'costume',
    theme: 'noel',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.snowman:Bonhomme de neige`,
    shapes: [],
    headwear: [
      ellipse(100, 62, 44, 8, '#212121'),
      rect(70, 20, 60, 44, 4, '#212121'),
      rect(70, 46, 60, 9, 0, '#e53935'),
    ],
  },
  // ---- Carnaval
  {
    id: 'costume-clown',
    slot: 'costume',
    theme: 'carnaval',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.clown:Clown`,
    shapes: [],
    headwear: [
      dot(54, 78, 16, '#ff7043'),
      dot(146, 78, 16, '#ff7043'),
      dot(66, 52, 15, '#ec407a'),
      dot(134, 52, 15, '#ec407a'),
      dot(100, 38, 15, '#ffd54f'),
      dot(84, 44, 14, '#26c6da'),
      dot(116, 44, 14, '#66bb6a'),
    ],
  },
  {
    id: 'costume-pirate',
    slot: 'costume',
    theme: 'carnaval',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.pirate:Pirate`,
    shapes: [],
    headwear: [
      path('M52 76 C52 46 76 34 100 34 C124 34 148 46 148 76 C130 66 70 66 52 76 Z', '#d32f2f'),
      rect(52, 68, 96, 9, 3, '#b71c1c'),
      path('M146 70 L172 80 L152 88 Z', '#d32f2f'),
      line('M60 76 L116 98', INK, 3),
      ellipse(84, 90, 12, 10, '#212121'),
    ],
  },
  {
    id: 'costume-knight',
    slot: 'costume',
    theme: 'carnaval',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.knight:Chevalier`,
    shapes: [],
    headwear: [
      path('M52 96 C48 36 152 36 148 96 L134 96 C134 60 66 60 66 96 Z', '#90a4ae'),
      rect(96, 58, 8, 38, 3, '#78909c'),
      path('M100 36 C92 14 114 8 124 22 C116 20 110 26 108 36 Z', '#e53935'),
    ],
  },
  {
    id: 'costume-princess',
    slot: 'costume',
    theme: 'carnaval',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.princess:Princesse`,
    shapes: [],
    headwear: [
      path('M68 62 L70 40 L84 52 L100 30 L116 52 L130 40 L132 62 Z', '#fbc02d'),
      dot(100, 44, 4, '#ec407a'),
      dot(76, 54, 3, '#42a5f5'),
      dot(124, 54, 3, '#42a5f5'),
    ],
  },
  {
    id: 'costume-hero',
    slot: 'costume',
    theme: 'carnaval',
    rarete: 'super',
    label: $localize`:@@avatar.costume.hero:Super-héros`,
    shapes: [],
    headwear: [
      path(
        'M58 84 C70 70 130 70 142 84 C142 104 128 106 118 98 C108 92 92 92 82 98 C72 106 58 104 58 84 Z',
        '#d32f2f',
      ),
      ellipse(84, 90, 8, 5, '#ffffff', { opacity: 0.9 }),
      ellipse(116, 90, 8, 5, '#ffffff', { opacity: 0.9 }),
    ],
  },
  {
    id: 'costume-dino',
    slot: 'costume',
    theme: 'carnaval',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.dino:Dinosaure`,
    shapes: [],
    headwear: [
      path('M52 96 C46 36 154 36 148 96 L136 96 C136 62 64 62 64 96 Z', '#43a047'),
      path('M76 46 L84 22 L92 42 L100 16 L108 42 L116 22 L124 46 Z', '#ff8f00'),
      dot(72, 52, 8, '#fafafa'),
      dot(128, 52, 8, '#fafafa'),
      dot(72, 52, 4, INK),
      dot(128, 52, 4, INK),
    ],
  },
  {
    id: 'costume-unicorn',
    slot: 'costume',
    theme: 'carnaval',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.unicorn:Licorne`,
    shapes: [],
    headwear: [
      path('M64 56 L58 24 L80 46 Z', '#f8bbd0'),
      path('M136 56 L142 24 L120 46 Z', '#f8bbd0'),
      path('M100 4 L108 52 L92 52 Z', '#ffd54f'),
      line('M94 40 L106 36', '#ffb300', 2),
      line('M93 28 L104 24', '#ffb300', 2),
      dot(60, 70, 8, '#f48fb1'),
      dot(56, 88, 8, '#81d4fa'),
      dot(140, 70, 8, '#f48fb1'),
      dot(144, 88, 8, '#fff176'),
    ],
  },
  // ---- Pâques
  {
    id: 'costume-bunny',
    slot: 'costume',
    theme: 'paques',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.bunny:Lapin`,
    shapes: [],
    headwear: [
      ellipse(78, 14, 12, 38, '#f5f5f5'),
      ellipse(122, 14, 12, 38, '#f5f5f5'),
      ellipse(78, 16, 5.5, 28, '#f8bbd0'),
      ellipse(122, 16, 5.5, 28, '#f8bbd0'),
    ],
  },
  // ---- Toute l'année
  {
    id: 'costume-astronaut',
    slot: 'costume',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.astronaut:Astronaute`,
    shapes: [],
    headwear: [
      circle(100, 90, 58, '#b3e5fc', { opacity: 0.28 }),
      circle(100, 90, 58, 'none', { stroke: '#eceff1', sw: 9 }),
      path('M70 56 Q80 44 96 42', 'none', { stroke: '#ffffff', sw: 5, opacity: 0.8 }),
    ],
  },
  {
    id: 'costume-firefighter',
    slot: 'costume',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.firefighter:Pompier`,
    shapes: [],
    headwear: [
      path('M56 80 C56 40 80 30 100 30 C120 30 144 40 144 80 Z', '#d32f2f'),
      rect(44, 76, 112, 10, 5, '#b71c1c'),
      path('M82 52 L118 52 L112 70 L88 70 Z', '#fdd835'),
      rect(96, 24, 8, 30, 3, '#b71c1c'),
    ],
  },
  {
    id: 'costume-doctor',
    slot: 'costume',
    rarete: 'super',
    includesHat: true,
    label: $localize`:@@avatar.costume.doctor:Docteur`,
    shapes: [],
    headwear: [
      rect(58, 62, 84, 8, 4, '#eceff1'),
      circle(100, 62, 10, '#b0bec5'),
      circle(100, 62, 6, '#e0f7fa'),
    ],
  },
  {
    id: 'costume-chef',
    slot: 'costume',
    rarete: 'super',
    hidesHair: true,
    includesHat: true,
    label: $localize`:@@avatar.costume.chef:Cuisinier`,
    shapes: [],
    headwear: [
      rect(62, 58, 76, 12, 3, '#fafafa'),
      dot(70, 44, 18, '#fafafa'),
      dot(100, 34, 20, '#fafafa'),
      dot(130, 44, 18, '#fafafa'),
      path('M70 60 H130', 'none', { stroke: '#e0e0e0', sw: 2 }),
    ],
  },
  {
    id: 'costume-football',
    slot: 'costume',
    rarete: 'super',
    label: $localize`:@@avatar.costume.football:Footballeur`,
    shapes: [],
    headwear: [line('M58 70 C80 62 120 62 142 70', '#e53935', 6)],
  },
];

export const COSTUMES: AvatarPart[] = COSTUME_HEADS.map((c) => ({ ...c, ...COSTUME_BODIES[c.id], space: 'body' as const }));

// =====================================================================================================================
// Visage : maquillages et masques (sous les yeux, donc yeux et bouche restent visibles)
// =====================================================================================================================

export const FACES: AvatarPart[] = [
  {
    id: 'none',
    slot: 'face',
    free: true,
    label: $localize`:@@avatar.face.none:Pas de maquillage`,
    shapes: [],
  },
  {
    id: 'face-freckles',
    slot: 'face',
    free: true,
    label: $localize`:@@avatar.face.freckles:Taches de rousseur`,
    shapes: [
      ...[
        [74, 102],
        [80, 108],
        [88, 104],
        [112, 104],
        [120, 108],
        [126, 102],
        [96, 100],
        [104, 100],
      ].map(([x, y]) => dot(x, y, 1.8, '#a1663a')),
    ],
  },
  {
    id: 'face-pumpkin',
    slot: 'face',
    theme: 'halloween',
    rarete: 'rare',
    label: $localize`:@@avatar.face.pumpkin:Maquillage citrouille`,
    shapes: [
      path('M70 78 L86 78 L78 64 Z', '#fb8c00'),
      path('M114 78 L130 78 L122 64 Z', '#fb8c00'),
      path('M80 112 L88 118 L94 112 L100 120 L106 112 L112 118 L120 112', 'none', {
        stroke: '#fb8c00',
        sw: 4,
      }),
      dot(100, 102, 3, '#fb8c00'),
    ],
  },
  {
    id: 'face-cat',
    slot: 'face',
    theme: 'halloween',
    rarete: 'commun',
    label: $localize`:@@avatar.face.cat:Moustaches de chat`,
    shapes: [
      path('M96 100 L104 100 L100 106 Z', '#f48fb1'),
      ...[0, 1, 2].flatMap((i) => [
        line(`M74 ${104 + i * 5} L50 ${100 + i * 9}`, '#37474f', 2),
        line(`M126 ${104 + i * 5} L150 ${100 + i * 9}`, '#37474f', 2),
      ]),
    ],
  },
  {
    id: 'face-reindeer',
    slot: 'face',
    theme: 'noel',
    rarete: 'commun',
    label: $localize`:@@avatar.face.reindeer:Nez rouge de renne`,
    shapes: [dot(100, 102, 8, '#e53935'), dot(97, 99, 2.5, '#ffcdd2')],
  },
  {
    id: 'face-clown-nose',
    slot: 'face',
    theme: 'carnaval',
    rarete: 'commun',
    label: $localize`:@@avatar.face.clownNose:Nez de clown`,
    shapes: [
      dot(100, 102, 9, '#d32f2f'),
      dot(97, 98, 2.5, '#ffcdd2'),
      dot(72, 106, 6, '#f06292'),
      dot(128, 106, 6, '#f06292'),
    ],
  },
  {
    id: 'face-hero-mask',
    slot: 'face',
    theme: 'carnaval',
    rarete: 'rare',
    label: $localize`:@@avatar.face.heroMask:Masque de super-héros`,
    shapes: [
      path(
        'M62 86 C74 74 126 74 138 86 C138 102 126 104 118 98 C108 94 92 94 82 98 C74 104 62 102 62 86 Z',
        '#1e88e5',
      ),
      path('M62 86 C74 74 126 74 138 86', 'none', { stroke: '#0d47a1', sw: 3 }),
    ],
  },
  {
    id: 'face-venetian',
    slot: 'face',
    theme: 'carnaval',
    rarete: 'rare',
    label: $localize`:@@avatar.face.venetian:Loup vénitien`,
    shapes: [
      path(
        'M58 84 C70 72 130 72 142 84 C140 106 126 108 118 100 C108 96 92 96 82 100 C74 108 60 106 58 84 Z',
        '#fafafa',
      ),
      path('M58 84 C70 72 130 72 142 84', 'none', { stroke: '#fbc02d', sw: 4 }),
      star(100, 80, 6, 2.8, '#fbc02d'),
      path('M58 84 L44 70 L52 90 Z', '#ab47bc'),
      path('M142 84 L156 70 L148 90 Z', '#ab47bc'),
    ],
  },
  {
    id: 'face-butterfly',
    slot: 'face',
    theme: 'paques',
    rarete: 'commun',
    label: $localize`:@@avatar.face.butterfly:Maquillage papillon`,
    shapes: [
      ellipse(72, 82, 14, 9, '#ab47bc', { opacity: 0.75 }),
      ellipse(76, 96, 9, 6, '#f06292', { opacity: 0.75 }),
      ellipse(128, 82, 14, 9, '#ab47bc', { opacity: 0.75 }),
      ellipse(124, 96, 9, 6, '#f06292', { opacity: 0.75 }),
      line('M66 74 L58 66', '#6a1b9a', 2),
      line('M134 74 L142 66', '#6a1b9a', 2),
    ],
  },
];

// =====================================================================================================================
// Dos : cape, ailes, sac (derrière le corps)
// =====================================================================================================================

export const BACKS: AvatarPart[] = [
  {
    id: 'none',
    slot: 'back',
    free: true,
    label: $localize`:@@avatar.back.none:Rien dans le dos`,
    shapes: [],
  },
  {
    id: 'back-cape-plain',
    slot: 'back',
    free: true,
    label: $localize`:@@avatar.back.capePlain:Cape bleue`,
    shapes: [
      path('M46 146 L154 146 L184 200 L16 200 Z', '#3b82f6'),
      path('M46 146 L154 146 L160 160 L40 160 Z', '#2563eb'),
    ],
  },
  {
    id: 'back-bat-wings',
    slot: 'back',
    theme: 'halloween',
    rarete: 'rare',
    label: $localize`:@@avatar.back.batWings:Ailes de chauve-souris`,
    shapes: [
      path(
        'M52 150 C30 110 10 112 6 96 C20 100 26 96 28 92 C34 106 44 106 48 100 C52 112 60 114 62 120 Z',
        '#37474f',
      ),
      path(
        'M148 150 C170 110 190 112 194 96 C180 100 174 96 172 92 C166 106 156 106 152 100 C148 112 140 114 138 120 Z',
        '#37474f',
      ),
      path('M52 150 L50 122 M52 150 L36 112', 'none', { stroke: '#263238', sw: 2.5 }),
      path('M148 150 L150 122 M148 150 L164 112', 'none', { stroke: '#263238', sw: 2.5 }),
    ],
  },
  {
    id: 'back-hero-cape',
    slot: 'back',
    theme: 'carnaval',
    rarete: 'rare',
    label: $localize`:@@avatar.back.heroCape:Cape de héros`,
    shapes: [
      path('M44 144 L156 144 L190 200 L10 200 Z', '#d32f2f'),
      path('M44 144 L156 144 L162 158 L38 158 Z', '#b71c1c'),
      path('M60 160 L52 200 M140 160 L148 200', 'none', { stroke: '#b71c1c', sw: 3 }),
    ],
  },
  {
    id: 'back-fairy-wings',
    slot: 'back',
    theme: 'carnaval',
    rarete: 'rare',
    label: $localize`:@@avatar.back.fairyWings:Ailes de fée`,
    shapes: [
      ellipse(34, 122, 26, 40, '#b3e5fc', { opacity: 0.8, stroke: '#81d4fa', sw: 2 }),
      ellipse(30, 168, 16, 26, '#f8bbd0', { opacity: 0.8, stroke: '#f48fb1', sw: 2 }),
      ellipse(166, 122, 26, 40, '#b3e5fc', { opacity: 0.8, stroke: '#81d4fa', sw: 2 }),
      ellipse(170, 168, 16, 26, '#f8bbd0', { opacity: 0.8, stroke: '#f48fb1', sw: 2 }),
      star(30, 112, 6, 2.6, '#ffffff'),
      star(170, 112, 6, 2.6, '#ffffff'),
    ],
  },
  {
    id: 'back-butterfly-wings',
    slot: 'back',
    theme: 'paques',
    rarete: 'rare',
    label: $localize`:@@avatar.back.butterflyWings:Ailes de papillon`,
    shapes: [
      ellipse(32, 122, 28, 36, '#ff9800', { stroke: '#e65100', sw: 3 }),
      ellipse(36, 170, 18, 24, '#ffb74d', { stroke: '#e65100', sw: 3 }),
      ellipse(168, 122, 28, 36, '#ff9800', { stroke: '#e65100', sw: 3 }),
      ellipse(164, 170, 18, 24, '#ffb74d', { stroke: '#e65100', sw: 3 }),
      ...[
        [28, 118, 8],
        [172, 118, 8],
        [34, 168, 5],
        [166, 168, 5],
      ].map(([x, y, r]) => dot(x, y, r, '#212121')),
    ],
  },
  {
    id: 'back-backpack',
    slot: 'back',
    theme: 'rentree',
    rarete: 'commun',
    label: $localize`:@@avatar.back.backpack:Sac à dos`,
    shapes: [
      rect(14, 140, 44, 60, 14, '#e53935'),
      rect(142, 140, 44, 60, 14, '#e53935'),
      rect(20, 176, 32, 18, 6, '#c62828'),
      rect(148, 176, 32, 18, 6, '#c62828'),
      rect(50, 156, 8, 44, 0, '#37474f'),
      rect(142, 156, 8, 44, 0, '#37474f'),
    ],
  },
];

// =====================================================================================================================
// Objets tenus (en bas, devant le corps, à droite)
// =====================================================================================================================

export const HELD: AvatarPart[] = [
  {
    id: 'none',
    slot: 'held',
    free: true,
    label: $localize`:@@avatar.held.none:Rien dans la main`,
    shapes: [],
  },
  {
    id: 'held-flower',
    slot: 'held',
    free: true,
    label: $localize`:@@avatar.held.flower:Fleur`,
    shapes: [
      line('M158 200 V160', '#43a047', 5),
      ellipse(168, 182, 10, 5, '#66bb6a'),
      ...[0, 72, 144, 216, 288].map((a) =>
        circle(
          158 + 12 * Math.cos(((a - 90) * Math.PI) / 180),
          150 + 12 * Math.sin(((a - 90) * Math.PI) / 180),
          8,
          '#f06292',
        ),
      ),
      dot(158, 150, 7, '#ffd54f'),
    ],
  },
  {
    id: 'held-lantern',
    slot: 'held',
    theme: 'halloween',
    rarete: 'commun',
    label: $localize`:@@avatar.held.lantern:Citrouille-lanterne`,
    shapes: [
      path('M160 138 Q160 128 168 126', 'none', { stroke: '#558b2f', sw: 5 }),
      ellipse(148, 172, 18, 24, '#fb8c00'),
      ellipse(172, 172, 18, 24, '#fb8c00'),
      ellipse(160, 172, 16, 25, '#ffa726'),
      path('M148 168 L156 168 L152 160 Z', '#3e2723'),
      path('M164 168 L172 168 L168 160 Z', '#3e2723'),
      path('M148 180 Q160 192 172 180 L166 178 L160 184 L154 178 Z', '#3e2723'),
    ],
  },
  {
    id: 'held-broom',
    slot: 'held',
    theme: 'halloween',
    rarete: 'commun',
    label: $localize`:@@avatar.held.broom:Balai de sorcière`,
    shapes: [
      line('M176 120 L146 196', '#795548', 6),
      path('M138 184 L162 192 L152 206 L128 196 Z', '#fbc02d'),
      line('M140 190 L134 198 M148 192 L142 202', '#f9a825', 2),
    ],
  },
  {
    id: 'held-candy-bucket',
    slot: 'held',
    theme: 'halloween',
    rarete: 'commun',
    label: $localize`:@@avatar.held.candyBucket:Seau de bonbons`,
    shapes: [
      path('M140 160 Q160 128 180 160', 'none', { stroke: '#37474f', sw: 4 }),
      path('M138 160 L182 160 L176 198 L144 198 Z', '#fb8c00'),
      path('M142 172 L178 172', 'none', { stroke: '#212121', sw: 3 }),
      dot(150, 156, 6, '#ec407a'),
      dot(162, 154, 6, '#42a5f5'),
      dot(172, 157, 6, '#fdd835'),
    ],
  },
  {
    id: 'held-candycane',
    slot: 'held',
    theme: 'noel',
    rarete: 'commun',
    label: $localize`:@@avatar.held.candycane:Sucre d'orge`,
    shapes: [
      path('M160 200 V148 Q160 132 174 132 Q186 132 186 144', 'none', {
        stroke: '#fafafa',
        sw: 10,
      }),
      path(
        'M160 190 L160 196 M160 170 L160 176 M160 150 L162 158 M170 134 L174 140 M184 138 L186 146',
        'none',
        { stroke: '#e53935', sw: 10 },
      ),
    ],
  },
  {
    id: 'held-gift',
    slot: 'held',
    theme: 'noel',
    rarete: 'commun',
    label: $localize`:@@avatar.held.gift:Cadeau`,
    shapes: [
      rect(138, 154, 46, 44, 5, '#42a5f5'),
      rect(134, 148, 54, 14, 4, '#1e88e5'),
      rect(156, 148, 10, 50, 0, '#fdd835'),
      path('M161 148 C148 128 136 142 161 148 C186 142 174 128 161 148 Z', '#fdd835'),
    ],
  },
  {
    id: 'held-speculoos',
    slot: 'held',
    theme: 'noel',
    rarete: 'commun',
    label: $localize`:@@avatar.held.speculoos:Spéculoos`,
    shapes: [
      path('M144 188 V170 H132 V156 H144 V144 H162 V156 H176 V170 H162 V188 Z', '#a1664a'),
      dot(146, 152, 2.5, '#fafafa'),
      dot(166, 152, 2.5, '#fafafa'),
      line('M148 164 Q154 170 160 164', '#fafafa', 2.5),
      line('M153 176 V184', '#fafafa', 2.5),
    ],
  },
  {
    id: 'held-wand',
    slot: 'held',
    theme: 'carnaval',
    rarete: 'commun',
    label: $localize`:@@avatar.held.wand:Baguette magique`,
    shapes: [
      line('M142 198 L172 150', '#5e35b1', 5),
      star(176, 142, 14, 6, '#ffd54f'),
      star(150, 130, 5, 2.2, '#ffd54f'),
      star(194, 160, 4, 1.8, '#ffd54f'),
    ],
  },
  {
    id: 'held-foam-sword',
    slot: 'held',
    theme: 'carnaval',
    rarete: 'commun',
    label: $localize`:@@avatar.held.foamSword:Épée en mousse`,
    shapes: [
      rect(160, 100, 14, 70, 7, '#90caf9'),
      rect(146, 168, 42, 9, 4, '#fdd835'),
      rect(160, 176, 14, 24, 5, '#e53935'),
    ],
  },
  {
    id: 'held-streamers',
    slot: 'held',
    theme: 'carnaval',
    rarete: 'commun',
    label: $localize`:@@avatar.held.streamers:Serpentins`,
    shapes: [
      path('M138 200 C148 170 132 160 150 142 C162 130 152 118 168 112', 'none', {
        stroke: '#ec407a',
        sw: 6,
      }),
      path('M156 200 C166 176 150 166 168 150 C178 140 172 130 186 124', 'none', {
        stroke: '#26c6da',
        sw: 6,
      }),
      path('M174 200 C182 182 170 174 184 160', 'none', { stroke: '#fdd835', sw: 6 }),
    ],
  },
  {
    id: 'held-egg-basket',
    slot: 'held',
    theme: 'paques',
    rarete: 'commun',
    label: $localize`:@@avatar.held.eggBasket:Panier d'œufs`,
    shapes: [
      path('M140 164 Q162 114 184 164', 'none', { stroke: '#a1887f', sw: 5 }),
      ellipse(152, 162, 8, 11, '#f48fb1'),
      ellipse(166, 160, 8, 11, '#81d4fa'),
      ellipse(178, 163, 8, 11, '#fff176'),
      path('M138 164 L186 164 L180 198 L144 198 Z', '#bc8f5f'),
      path('M142 174 H182 M144 186 H180', 'none', { stroke: '#8d6e63', sw: 2.5 }),
    ],
  },
  {
    id: 'held-watering-can',
    slot: 'held',
    theme: 'paques',
    rarete: 'commun',
    label: $localize`:@@avatar.held.wateringCan:Arrosoir`,
    shapes: [
      path('M132 148 L168 148 L164 196 L136 196 Z', '#42a5f5'),
      path('M168 160 L196 140 L198 148 L170 172 Z', '#1e88e5'),
      path('M136 156 Q116 156 120 176 Q124 188 134 186', 'none', { stroke: '#1e88e5', sw: 5 }),
      path('M190 134 L200 138 L196 146 Z', '#1565c0'),
    ],
  },
  {
    id: 'held-icecream',
    slot: 'held',
    theme: 'ete',
    rarete: 'commun',
    label: $localize`:@@avatar.held.icecream:Glace`,
    shapes: [
      path('M148 150 L172 150 L160 198 Z', '#e0a458'),
      dot(160, 144, 15, '#f48fb1'),
      dot(160, 130, 13, '#fff59d'),
      dot(160, 118, 9, '#a5d6a7'),
    ],
  },
  {
    id: 'held-float',
    slot: 'held',
    theme: 'ete',
    rarete: 'rare',
    label: $localize`:@@avatar.held.float:Bouée`,
    shapes: [
      circle(158, 172, 28, 'none', { stroke: '#fafafa', sw: 16 }),
      ...[0, 90, 180, 270].map((a) =>
        path(
          `M${158 + 28 * Math.cos((a * Math.PI) / 180) - 3} ${172 + 28 * Math.sin((a * Math.PI) / 180) - 3} h6 v6 h-6 Z`,
          '#e53935',
        ),
      ),
      circle(158, 172, 28, 'none', { stroke: '#e53935', sw: 16, opacity: 0.55 }),
    ],
  },
  {
    id: 'held-bucket-spade',
    slot: 'held',
    theme: 'ete',
    rarete: 'commun',
    label: $localize`:@@avatar.held.bucketSpade:Pelle et seau`,
    shapes: [
      path('M138 160 L174 160 L168 198 L144 198 Z', '#e53935'),
      rect(136, 156, 40, 8, 3, '#c62828'),
      path('M142 160 Q156 140 170 160', 'none', { stroke: '#fdd835', sw: 3.5 }),
      line('M184 200 L190 140', '#1e88e5', 5),
      path('M182 134 L198 138 L192 150 L180 146 Z', '#1e88e5'),
    ],
  },
  {
    id: 'held-big-pencil',
    slot: 'held',
    theme: 'rentree',
    rarete: 'commun',
    label: $localize`:@@avatar.held.bigPencil:Crayon géant`,
    shapes: [
      rect(160, 110, 16, 74, 0, '#fdd835'),
      path('M160 184 L176 184 L168 204 Z', '#ffe0b2'),
      path('M164 196 L172 196 L168 204 Z', '#37474f'),
      rect(160, 100, 16, 12, 3, '#f48fb1'),
      rect(160, 112, 16, 6, 0, '#b0bec5'),
    ],
  },
  {
    id: 'held-book',
    slot: 'held',
    theme: 'rentree',
    rarete: 'commun',
    label: $localize`:@@avatar.held.book:Livre`,
    shapes: [
      rect(132, 160, 56, 40, 4, '#7e57c2'),
      rect(138, 164, 46, 32, 2, '#fafafa'),
      line('M161 164 V196', '#b39ddb', 2),
      ...[172, 180, 188].map((y) => line(`M142 ${y} H157`, '#b0bec5', 2)),
    ],
  },
  {
    id: 'held-umbrella',
    slot: 'held',
    theme: 'automne',
    rarete: 'rare',
    label: $localize`:@@avatar.held.umbrella:Parapluie`,
    shapes: [
      line('M160 200 V128', '#455a64', 4),
      path(
        'M120 132 C124 100 196 100 200 132 Q190 124 180 132 Q170 124 160 132 Q150 124 140 132 Q130 124 120 132 Z',
        '#ef5350',
      ),
      path('M160 104 V132 M140 108 L146 132 M180 108 L174 132', 'none', {
        stroke: '#c62828',
        sw: 2,
      }),
    ],
  },
  {
    id: 'held-maple-leaf',
    slot: 'held',
    theme: 'automne',
    rarete: 'commun',
    label: $localize`:@@avatar.held.mapleLeaf:Feuille d'érable`,
    shapes: [
      path('M160 200 V166', 'none', { stroke: '#8d6e63', sw: 4 }),
      path(
        'M160 164 L150 150 L154 148 L146 134 L156 138 L160 122 L164 138 L174 134 L166 148 L170 150 Z',
        '#e65100',
      ),
      path('M160 164 V136', 'none', { stroke: '#bf360c', sw: 2 }),
    ],
  },
  {
    id: 'held-hot-chocolate',
    slot: 'held',
    theme: 'hiver',
    rarete: 'commun',
    label: $localize`:@@avatar.held.hotChocolate:Tasse de chocolat chaud`,
    shapes: [
      path('M140 164 H178 L174 198 H144 Z', '#fafafa'),
      path('M178 170 Q194 170 192 182 Q190 192 176 190', 'none', { stroke: '#fafafa', sw: 5 }),
      ellipse(159, 164, 19, 5, '#6d4c41'),
      path('M150 156 Q146 146 152 138 M162 156 Q158 146 164 138', 'none', {
        stroke: '#cfd8dc',
        sw: 3,
        opacity: 0.9,
      }),
    ],
  },
  {
    id: 'held-balloon',
    slot: 'held',
    theme: 'anniversaire',
    rarete: 'commun',
    label: $localize`:@@avatar.held.balloon:Ballon`,
    shapes: [
      path('M158 200 Q166 180 160 150', 'none', { stroke: '#9e9e9e', sw: 2 }),
      ellipse(160, 120, 22, 28, '$c'),
      ellipse(152, 108, 5, 9, '#ffffff', { opacity: 0.4 }),
      path('M155 147 L160 142 L165 147 Z', '$c'),
    ],
  },
  {
    id: 'held-cake',
    slot: 'held',
    theme: 'anniversaire',
    rarete: 'commun',
    label: $localize`:@@avatar.held.cake:Part de gâteau`,
    shapes: [
      path('M134 192 L188 192 L188 168 L134 168 Z', '#f8bbd0'),
      path('M134 168 L188 168 L168 148 L134 168 Z', '#fff8e1'),
      path('M134 168 Q144 178 154 168 Q164 178 174 168 Q180 174 188 168', 'none', {
        stroke: '#f06292',
        sw: 4,
      }),
      dot(166, 148, 6, '#e53935'),
      rect(132, 192, 58, 6, 3, '#bdbdbd'),
    ],
  },
];

// =====================================================================================================================
// Habits, chapeaux, accessoires, coiffures, fonds supplémentaires
// =====================================================================================================================

export const EXTRA_HATS: AvatarPart[] = [
  {
    id: 'hat-witch',
    slot: 'hat',
    theme: 'halloween',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.witch:Chapeau de sorcière`,
    shapes: [
      ellipse(100, 66, 54, 10, '#212121'),
      path('M70 64 C80 50 90 30 106 2 C108 30 122 50 130 64 Z', '#212121'),
      rect(78, 52, 44, 9, 2, '#8e24aa'),
      rect(96, 50, 12, 12, 2, '#ffd54f'),
    ],
  },
  {
    id: 'hat-santa',
    slot: 'hat',
    theme: 'noel',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.santa:Bonnet de Noël`,
    shapes: [
      path(
        'M56 74 C56 44 74 30 100 30 C126 30 144 46 160 74 L148 78 C140 66 124 62 100 62 C82 62 66 66 56 74 Z',
        '#e53935',
      ),
      rect(54, 66, 92, 14, 7, '#fafafa'),
      dot(158, 74, 9, '#fafafa'),
    ],
  },
  {
    id: 'hat-antlers',
    slot: 'hat',
    theme: 'noel',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.antlers:Serre-tête de renne`,
    shapes: [
      path('M58 62 C70 52 130 52 142 62', 'none', { stroke: '#6d4c41', sw: 5 }),
      path('M68 56 L60 30 M64 42 L52 38 M64 46 L70 30', 'none', { stroke: '#8d6e63', sw: 6 }),
      path('M132 56 L140 30 M136 42 L148 38 M136 46 L130 30', 'none', { stroke: '#8d6e63', sw: 6 }),
    ],
  },
  {
    id: 'hat-bunny-ears',
    slot: 'hat',
    theme: 'paques',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.bunnyEars:Oreilles de lapin`,
    shapes: [
      path('M62 64 C74 54 126 54 138 64', 'none', { stroke: '#f48fb1', sw: 5 }),
      ellipse(78, 28, 11, 32, '#f5f5f5'),
      ellipse(122, 28, 11, 32, '#f5f5f5'),
      ellipse(78, 30, 5, 24, '#f8bbd0'),
      ellipse(122, 30, 5, 24, '#f8bbd0'),
    ],
  },
  {
    id: 'hat-flower-crown',
    slot: 'hat',
    theme: 'paques',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.flowerCrown:Couronne de fleurs`,
    shapes: [
      path('M58 70 C70 56 130 56 142 70', 'none', { stroke: '#66bb6a', sw: 5 }),
      ...[
        [64, 66, '#f06292'],
        [80, 58, '#fff176'],
        [100, 55, '#f06292'],
        [120, 58, '#fff176'],
        [136, 66, '#f06292'],
      ].map(([x, y, c]) => circle(x as number, y as number, 7, c as string)),
      ...[64, 100, 136].map((x) => circle(x, x === 100 ? 55 : 66, 2.5, '#ffb300')),
    ],
  },
  {
    id: 'hat-straw',
    slot: 'hat',
    theme: 'ete',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.straw:Chapeau de paille`,
    shapes: [
      path('M70 64 C70 38 86 30 100 30 C114 30 130 38 130 64 Z', '#e6c27a'),
      rect(70, 54, 60, 8, 0, '#e53935'),
      path('M34 70 C48 58 152 58 166 70 C152 84 48 84 34 70 Z', '#d9b25f'),
    ],
  },
  {
    id: 'hat-beach',
    slot: 'hat',
    theme: 'ete',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.beach:Bob de plage`,
    shapes: [
      path('M64 68 C66 40 82 34 100 34 C118 34 134 40 136 68 Z', '#26c6da'),
      path('M48 72 C58 62 142 62 152 72 C142 82 58 82 48 72 Z', '#00acc1'),
      ...row([84, 100, 116], 52, 4, '#fafafa'),
    ],
  },
  {
    id: 'hat-school-cap',
    slot: 'hat',
    theme: 'rentree',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.schoolCap:Casquette d'écolier`,
    shapes: [
      path('M58 74 C58 46 78 36 100 36 C122 36 142 46 142 74 Z', '#283593'),
      path('M96 72 C112 68 146 68 160 77 C148 82 112 82 96 76 Z', '#1a237e'),
      dot(100, 37, 4, '#ffd54f'),
      rect(58, 66, 84, 6, 0, '#ffd54f'),
    ],
  },
  {
    id: 'hat-pompom',
    slot: 'hat',
    theme: 'hiver',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.pompom:Bonnet à pompon`,
    shapes: [
      path('M56 78 C56 46 76 34 100 34 C124 34 144 46 144 78 Z', '#e53935'),
      rect(54, 66, 92, 16, 8, '#fafafa'),
      ...[64, 80, 96, 112, 128].map((x) => line(`M${x} 68 V80`, '#e0e0e0', 2)),
      dot(100, 24, 12, '#fafafa'),
    ],
  },
  {
    id: 'hat-earmuffs',
    slot: 'hat',
    theme: 'hiver',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.earmuffs:Cache-oreilles`,
    shapes: [
      path('M52 96 C46 30 154 30 148 96', 'none', { stroke: '#37474f', sw: 5 }),
      circle(54, 96, 14, '#ec407a'),
      circle(146, 96, 14, '#ec407a'),
      circle(54, 96, 8, '#f8bbd0'),
      circle(146, 96, 8, '#f8bbd0'),
    ],
  },
  {
    id: 'hat-party',
    slot: 'hat',
    theme: 'anniversaire',
    rarete: 'commun',
    label: $localize`:@@avatar.hat.party:Chapeau pointu de fête`,
    shapes: [
      path('M100 4 L136 70 L64 70 Z', '#ab47bc'),
      ...[
        [88, 50, '#fdd835'],
        [108, 38, '#26c6da'],
        [112, 58, '#f06292'],
        [92, 66, '#66bb6a'],
      ].map(([x, y, c]) => circle(x as number, y as number, 4, c as string)),
      dot(100, 6, 7, '#fdd835'),
      path('M64 70 L136 70', 'none', { stroke: '#7b1fa2', sw: 4 }),
    ],
  },
  {
    id: 'hat-cake-crown',
    slot: 'hat',
    theme: 'anniversaire',
    rarete: 'rare',
    label: $localize`:@@avatar.hat.cakeCrown:Couronne gâteau`,
    shapes: [
      path('M64 70 L64 52 L136 52 L136 70 Z', '#f8bbd0'),
      path(
        'M64 52 Q74 62 84 52 Q94 62 104 52 Q114 62 124 52 Q130 58 136 52 L136 46 L64 46 Z',
        '#fff8e1',
      ),
      ...[78, 100, 122].map((x) => rect(x - 3, 28, 6, 20, 2, '#42a5f5')),
      ...[78, 100, 122].map((x) => ellipse(x, 24, 4, 6, '#ffb300')),
    ],
  },
];

export const EXTRA_ACCESSORIES: AvatarPart[] = [
  {
    id: 'acc-diving-mask',
    slot: 'accessory',
    zone: 'eyes',
    theme: 'ete',
    rarete: 'rare',
    label: $localize`:@@avatar.accessory.divingMask:Masque de plongée`,
    shapes: [
      path(
        'M64 80 H136 C140 80 142 84 142 88 V96 C142 106 134 108 126 106 C116 104 112 98 100 98 C88 98 84 104 74 106 C66 108 58 106 58 96 V88 C58 84 60 80 64 80 Z',
        '#80deea',
        { opacity: 0.35 },
      ),
      path(
        'M64 80 H136 C140 80 142 84 142 88 V96 C142 106 134 108 126 106 C116 104 112 98 100 98 C88 98 84 104 74 106 C66 108 58 106 58 96 V88 C58 84 60 80 64 80 Z',
        'none',
        { stroke: '#0097a7', sw: 4 },
      ),
      line('M58 90 L46 92 M142 90 L154 92', '#0097a7', 4),
      rect(96, 74, 8, 8, 2, '#0097a7'),
    ],
  },
  {
    id: 'acc-long-scarf',
    slot: 'accessory',
    zone: 'neck',
    theme: 'hiver',
    rarete: 'commun',
    label: $localize`:@@avatar.accessory.longScarf:Écharpe longue`,
    shapes: [
      path('M70 140 C86 152 114 152 130 140 L132 156 C114 168 86 168 68 156 Z', '#e53935'),
      path('M112 156 L130 196 L116 202 L102 164 Z', '#c62828'),
      ...[0, 1, 2].map((i) =>
        line(`M${106 + i * 6} ${172 + i * 8} L${116 + i * 6} ${168 + i * 8}`, '#fafafa', 3),
      ),
      rect(76, 146, 8, 14, 0, '#fafafa', { opacity: 0.55 }),
      rect(116, 146, 8, 14, 0, '#fafafa', { opacity: 0.55 }),
    ],
  },
];

export const EXTRA_HAIRS: AvatarPart[] = [
  {
    id: 'hair-braids',
    slot: 'hair',
    rarete: 'commun',
    label: $localize`:@@avatar.hair.braids:Tresses`,
    back: [
      ...[0, 1, 2, 3].map((i) => ellipse(52 - i * 1.5, 104 + i * 14, 9, 9, '$c')),
      ...[0, 1, 2, 3].map((i) => ellipse(148 + i * 1.5, 104 + i * 14, 9, 9, '$c')),
    ],
    shapes: [
      path(
        'M58 86 C56 56 76 42 100 42 C124 42 144 56 142 86 C132 70 118 62 102 62 L100 50 L98 62 C82 62 68 70 58 86 Z',
      ),
      circle(50, 156, 5.5, '#ec4899'),
      circle(150, 156, 5.5, '#ec4899'),
    ],
  },
  {
    id: 'hair-double-buns',
    slot: 'hair',
    rarete: 'commun',
    label: $localize`:@@avatar.hair.doubleBuns:Double chignon`,
    shapes: [
      circle(68, 38, 15),
      circle(132, 38, 15),
      circle(64, 34, 5, '$l', { opacity: 0.3 }),
      path(HAIR_CAP_X),
      line('M84 50 Q100 44 116 50', '$d', 2.5),
    ],
  },
  {
    id: 'hair-spikes',
    slot: 'hair',
    rarete: 'commun',
    label: $localize`:@@avatar.hair.spikes:Cheveux en pics`,
    shapes: [
      path(
        'M58 86 C54 66 60 56 66 50 L68 34 L82 46 L88 26 L100 42 L112 26 L118 46 L132 34 L134 50 C140 56 146 66 142 86 C134 72 120 62 100 62 C84 62 70 72 58 86 Z',
      ),
    ],
  },
];

export const EXTRA_GRADIENTS: GradientOption[] = [
  {
    id: 'bg-forest',
    label: $localize`:@@avatar.bg.forest:Forêt`,
    from: '#bbf7d0',
    to: '#15803d',
    rarete: 'rare',
  },
  {
    id: 'bg-snow',
    label: $localize`:@@avatar.bg.snow:Neige`,
    from: '#f1f5f9',
    to: '#93c5fd',
    rarete: 'rare',
    theme: 'hiver',
  },
  {
    id: 'bg-beach',
    label: $localize`:@@avatar.bg.beach:Plage`,
    from: '#bae6fd',
    to: '#fde68a',
    rarete: 'rare',
    theme: 'ete',
  },
  {
    id: 'bg-space',
    label: $localize`:@@avatar.bg.space:Espace`,
    from: '#0f172a',
    to: '#6d28d9',
    rarete: 'rare',
  },
];
