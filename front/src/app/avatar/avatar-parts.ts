/*
 * Catalogue des pièces d'avatar : dessins originaux, style cartoon plat et arrondi, viewBox commun 0 0 200 200.
 * Tête centrée en (100, 90), yeux à y = 90, bouche vers y = 110, épaules à partir de y = 150.
 *
 * Ajouter une pièce : une entrée dans la liste de son emplacement (id stable, jamais réutilisé : il est enregistré
 * dans les avatars des membres), libellé traduit ($localize + messages.nl.xlf). Retirer une pièce : les avatars qui
 * l'utilisaient retombent sur la pièce par défaut de l'emplacement (normalizeAvatar), sans erreur.
 */
import { INK, Shape, circle, ellipse, line, path, rect, star } from '../shared/svg/shapes';

/** Emplacements : une pièce posée va toujours au sien. */
export type AvatarSlot = 'background' | 'body' | 'head' | 'eyes' | 'mouth' | 'hair' | 'hat' | 'accessory';

/** Zone du personnage où une pièce s'aimante (surlignée pendant un glisser-déposer). */
export type DropZone = 'hair' | 'hat' | 'face' | 'eyes' | 'mouth' | 'ears' | 'neck' | 'body' | 'background';

/** Rectangle [x, y, largeur, hauteur] de chaque zone, dans le viewBox 0 0 200 200. */
export const ZONES: Record<DropZone, readonly [number, number, number, number]> = {
  hair: [42, 26, 116, 112],
  hat: [36, 0, 128, 82],
  face: [56, 46, 88, 90],
  eyes: [62, 74, 76, 32],
  mouth: [78, 98, 44, 30],
  ears: [44, 82, 112, 34],
  neck: [64, 134, 72, 58],
  body: [30, 140, 140, 60],
  background: [0, 0, 200, 200],
};

export interface AvatarPart {
  id: string;
  label: string;
  slot: AvatarSlot;
  /** Calque principal. */
  shapes: Shape[];
  /** Cheveux : partie derrière la tête (cheveux longs, afro…). */
  back?: Shape[];
  /** Habits : partie devant le cou (col, capuche…), dessinée après la tête. */
  front?: Shape[];
  /** Accessoires : zone où il se pose (lunettes → yeux, nœud papillon → cou…). */
  zone?: DropZone;
}

export interface ColorOption {
  value: string;
  label: string;
}

export interface GradientOption {
  /** Enregistré tel quel dans l'avatar (champ background), à la place d'une couleur. */
  id: string;
  label: string;
  from: string;
  to: string;
}

export const NONE = 'none';

// ---------- tête (commune) et teints

/** Oreilles, cou, visage et joues ; couleur = teint. */
export const HEAD_SHAPES: Shape[] = [
  circle(60, 94, 9, '$c'),
  circle(140, 94, 9, '$c'),
  circle(60, 94, 4.5, '$d'),
  circle(140, 94, 4.5, '$d'),
  rect(86, 118, 28, 38, 10, '$d'),
  ellipse(100, 90, 40, 43, '$c'),
  circle(76, 106, 7, '#f48fb1', { opacity: 0.35 }),
  circle(124, 106, 7, '#f48fb1', { opacity: 0.35 }),
];

export interface SkinTone extends ColorOption {
  id: string;
}

export const SKIN_TONES: SkinTone[] = [
  { id: 'skin-1', value: '#f9d7c1', label: $localize`:@@avatar.skin.1:Teint très clair` },
  { id: 'skin-2', value: '#f1c27d', label: $localize`:@@avatar.skin.2:Teint clair` },
  { id: 'skin-3', value: '#e0ac69', label: $localize`:@@avatar.skin.3:Teint doré` },
  { id: 'skin-4', value: '#c68642', label: $localize`:@@avatar.skin.4:Teint mat` },
  { id: 'skin-5', value: '#8d5524', label: $localize`:@@avatar.skin.5:Teint foncé` },
  { id: 'skin-6', value: '#5c3a1e', label: $localize`:@@avatar.skin.6:Teint très foncé` },
];

// ---------- yeux (y = 90, x = 84 et 116)

const PUPILS = [circle(84, 90, 5.5, INK), circle(116, 90, 5.5, INK), circle(86, 88, 1.8, '#ffffff'), circle(118, 88, 1.8, '#ffffff')];

export const EYES: AvatarPart[] = [
  { id: 'eyes-round', slot: 'eyes', label: $localize`:@@avatar.eyes.round:Yeux ronds`, shapes: PUPILS },
  {
    id: 'eyes-happy',
    slot: 'eyes',
    label: $localize`:@@avatar.eyes.happy:Yeux rieurs`,
    shapes: [line('M77 93 Q84 84 91 93'), line('M109 93 Q116 84 123 93')],
  },
  {
    id: 'eyes-wink',
    slot: 'eyes',
    label: $localize`:@@avatar.eyes.wink:Clin d'œil`,
    shapes: [circle(84, 90, 5.5, INK), circle(86, 88, 1.8, '#ffffff'), line('M109 90 Q116 96 123 90'), line('M108 80 Q116 77 124 81', INK, 2.5)],
  },
  {
    id: 'eyes-surprised',
    slot: 'eyes',
    label: $localize`:@@avatar.eyes.surprised:Yeux étonnés`,
    shapes: [
      circle(84, 90, 8.5, '#ffffff', { stroke: INK, sw: 2 }),
      circle(116, 90, 8.5, '#ffffff', { stroke: INK, sw: 2 }),
      circle(84, 91, 4, INK),
      circle(116, 91, 4, INK),
      line('M75 74 Q84 68 93 74', INK, 2.5),
      line('M107 74 Q116 68 125 74', INK, 2.5),
    ],
  },
  {
    id: 'eyes-sleepy',
    slot: 'eyes',
    label: $localize`:@@avatar.eyes.sleepy:Yeux endormis`,
    shapes: [
      line('M77 90 Q84 96 91 90'),
      line('M109 90 Q116 96 123 90'),
      line('M79 94 L76 98', INK, 2),
      line('M121 94 L124 98', INK, 2),
    ],
  },
];

// ---------- bouche (vers y = 110)

export const MOUTHS: AvatarPart[] = [
  {
    id: 'mouth-smile',
    slot: 'mouth',
    label: $localize`:@@avatar.mouth.smile:Sourire`,
    shapes: [line('M88 108 Q100 120 112 108')],
  },
  {
    id: 'mouth-grin',
    slot: 'mouth',
    label: $localize`:@@avatar.mouth.grin:Grand sourire`,
    shapes: [path('M84 105 L116 105 Q100 131 84 105 Z', '#7a2e3a'), path('M87 106 L113 106 L111 111 L89 111 Z', '#ffffff'), ellipse(100, 119, 7, 4, '#f28b9a')],
  },
  {
    id: 'mouth-tongue',
    slot: 'mouth',
    label: $localize`:@@avatar.mouth.tongue:Langue tirée`,
    shapes: [
      path('M93 112 Q93 126 100 126 Q107 126 107 112 Z', '#f28b9a'),
      line('M100 115 L100 121', '#e06c80', 1.5),
      line('M88 108 Q100 118 112 108'),
    ],
  },
  { id: 'mouth-o', slot: 'mouth', label: $localize`:@@avatar.mouth.o:Bouche en « o »`, shapes: [ellipse(100, 113, 6, 7.5, '#7a2e3a')] },
  { id: 'mouth-neutral', slot: 'mouth', label: $localize`:@@avatar.mouth.neutral:Neutre`, shapes: [line('M90 111 L110 111')] },
];

// ---------- cheveux (couleur = couleur des cheveux)

/** Dessus de tête commun à plusieurs coiffures. */
const HAIR_CAP = 'M58 86 C56 56 76 42 100 42 C124 42 144 56 142 86 C134 72 120 62 100 62 C84 62 70 70 58 86 Z';

export const HAIRS: AvatarPart[] = [
  {
    id: 'hair-short',
    slot: 'hair',
    label: $localize`:@@avatar.hair.short:Court`,
    shapes: [path(HAIR_CAP), path('M84 46 C90 56 100 58 112 56', 'none', { stroke: '$d', sw: 3 })],
  },
  {
    id: 'hair-long',
    slot: 'hair',
    label: $localize`:@@avatar.hair.long:Long`,
    back: [path('M56 90 C52 55 74 40 100 40 C126 40 148 55 144 90 L150 158 C142 168 124 166 118 156 L118 120 L82 120 L82 156 C76 166 58 168 50 158 Z')],
    shapes: [path('M58 90 C56 56 76 42 100 42 C124 42 144 56 142 90 C136 74 124 64 110 60 C100 70 80 76 58 90 Z')],
  },
  {
    id: 'hair-curly',
    slot: 'hair',
    label: $localize`:@@avatar.hair.curly:Bouclés`,
    back: [circle(56, 100, 12), circle(144, 100, 12), circle(58, 116, 9), circle(142, 116, 9)],
    shapes: [
      path('M60 80 C60 56 78 46 100 46 C122 46 140 56 140 80 Z'),
      ...[
        [62, 80],
        [66, 64],
        [78, 52],
        [93, 46],
        [107, 46],
        [122, 52],
        [134, 64],
        [138, 80],
      ].map(([x, y]) => circle(x, y, 11)),
      circle(84, 62, 9, '$l', { opacity: 0.25 }),
    ],
  },
  {
    id: 'hair-pigtails',
    slot: 'hair',
    label: $localize`:@@avatar.hair.pigtails:Couettes`,
    back: [ellipse(44, 104, 13, 21), ellipse(156, 104, 13, 21)],
    shapes: [
      path('M58 86 C56 56 76 42 100 42 C124 42 144 56 142 86 C132 70 118 62 102 62 L100 50 L98 62 C82 62 68 70 58 86 Z'),
      circle(56, 86, 5.5, '#ec4899'),
      circle(144, 86, 5.5, '#ec4899'),
    ],
  },
  {
    id: 'hair-bun',
    slot: 'hair',
    label: $localize`:@@avatar.hair.bun:Chignon`,
    shapes: [circle(100, 36, 16), circle(96, 32, 6, '$l', { opacity: 0.3 }), path(HAIR_CAP), line('M84 50 Q100 44 116 50', '$d', 2.5)],
  },
  {
    id: 'hair-mohawk',
    slot: 'hair',
    label: $localize`:@@avatar.hair.mohawk:Crête`,
    shapes: [path(HAIR_CAP, '$c', { opacity: 0.35 }), path('M88 62 L84 26 L94 38 L100 16 L106 38 L116 26 L112 62 C106 58 94 58 88 62 Z')],
  },
  {
    id: 'hair-bald',
    slot: 'hair',
    label: $localize`:@@avatar.hair.bald:Chauve`,
    shapes: [ellipse(84, 60, 11, 5.5, '#ffffff', { opacity: 0.3 })],
  },
  {
    id: 'hair-afro',
    slot: 'hair',
    label: $localize`:@@avatar.hair.afro:Afro`,
    back: [circle(100, 80, 60), circle(80, 44, 14, '$l', { opacity: 0.18 })],
    shapes: [path('M62 82 C60 58 80 46 100 46 C120 46 140 58 138 82 C128 70 114 64 100 64 C86 64 72 70 62 82 Z')],
  },
  {
    id: 'hair-fringe',
    slot: 'hair',
    label: $localize`:@@avatar.hair.fringe:Frange`,
    back: [path('M54 88 C52 58 74 40 100 40 C126 40 148 58 146 88 L146 128 C136 134 126 132 122 124 L78 124 C74 132 64 134 54 128 Z')],
    shapes: [path('M58 84 C56 54 76 42 100 42 C124 42 144 54 142 84 C140 76 136 72 132 72 L68 72 C64 72 60 76 58 84 Z')],
  },
  {
    id: 'hair-ponytail',
    slot: 'hair',
    label: $localize`:@@avatar.hair.ponytail:Queue de cheval`,
    back: [path('M124 58 C160 54 172 100 160 144 C154 156 138 152 142 138 C150 108 144 82 122 74 Z')],
    shapes: [path(HAIR_CAP), circle(130, 64, 5.5, '$dd')],
  },
];

export const HAIR_COLORS: ColorOption[] = [
  { value: '#2b2118', label: $localize`:@@avatar.color.black:Noir` },
  { value: '#6b3e26', label: $localize`:@@avatar.color.brown:Brun` },
  { value: '#9a6a3a', label: $localize`:@@avatar.color.chestnut:Châtain` },
  { value: '#e8c267', label: $localize`:@@avatar.color.blond:Blond` },
  { value: '#d9772b', label: $localize`:@@avatar.color.ginger:Roux` },
  { value: '#a3a3a3', label: $localize`:@@avatar.color.grey:Gris` },
  { value: '#3b82f6', label: $localize`:@@avatar.color.blue:Bleu` },
  { value: '#ec4899', label: $localize`:@@avatar.color.pink:Rose` },
  { value: '#22c55e', label: $localize`:@@avatar.color.green:Vert` },
  { value: '#8b5cf6', label: $localize`:@@avatar.color.purple:Violet` },
];

// ---------- habits (couleur = couleur de l'habit)

/** Buste commun. */
const TORSO = 'M34 200 C36 168 60 150 100 150 C140 150 164 168 166 200 Z';

export const OUTFITS: AvatarPart[] = [
  {
    id: 'outfit-tshirt',
    slot: 'body',
    label: $localize`:@@avatar.outfit.tshirt:T-shirt`,
    shapes: [path(TORSO)],
    front: [line('M86 151 Q100 164 114 151', '$d', 3.5)],
  },
  {
    id: 'outfit-sweater',
    slot: 'body',
    label: $localize`:@@avatar.outfit.sweater:Pull`,
    shapes: [path(TORSO), line('M42 180 H158', '$l', 5, { opacity: 0.55 }), line('M38 191 H162', '$l', 5, { opacity: 0.55 })],
    front: [rect(84, 140, 32, 20, 9, '$d')],
  },
  {
    id: 'outfit-hoodie',
    slot: 'body',
    label: $localize`:@@avatar.outfit.hoodie:Sweat à capuche`,
    shapes: [path('M60 162 C56 138 76 128 100 128 C124 128 144 138 140 162 Z', '$d'), path(TORSO), path('M72 186 H128 L122 200 H78 Z', '$d')],
    front: [
      path('M78 150 C84 162 116 162 122 150 C116 156 84 156 78 150 Z', '$d'),
      line('M92 158 L90 178', '#ffffff', 2.5),
      line('M108 158 L110 178', '#ffffff', 2.5),
    ],
  },
  {
    id: 'outfit-shirt',
    slot: 'body',
    label: $localize`:@@avatar.outfit.shirt:Chemise`,
    shapes: [path(TORSO), line('M100 158 V200', '$d', 2), circle(100, 172, 2.4, '$dd'), circle(100, 186, 2.4, '$dd')],
    front: [path('M100 158 L85 145 L80 163 Z', '#ffffff'), path('M100 158 L115 145 L120 163 Z', '#ffffff')],
  },
  {
    id: 'outfit-dress',
    slot: 'body',
    label: $localize`:@@avatar.outfit.dress:Robe`,
    shapes: [
      path(TORSO, '$skin'),
      path('M56 200 C56 176 66 160 82 156 L118 156 C134 160 144 176 144 200 Z'),
      rect(78, 148, 8, 14, 3),
      rect(114, 148, 8, 14, 3),
      ...[
        [80, 180],
        [100, 170],
        [120, 180],
        [90, 194],
        [110, 194],
      ].map(([x, y]) => circle(x, y, 3, '#ffffff', { opacity: 0.6 })),
    ],
  },
  {
    id: 'outfit-overalls',
    slot: 'body',
    label: $localize`:@@avatar.outfit.overalls:Salopette`,
    shapes: [
      path(TORSO, '#eceff1'),
      path('M70 200 V170 C70 166 72 164 76 164 H124 C128 164 130 166 130 170 V200 Z'),
      line('M76 166 L66 150', '$c', 8),
      line('M124 166 L134 150', '$c', 8),
      circle(78, 170, 3.5, '#fbbf24'),
      circle(122, 170, 3.5, '#fbbf24'),
      rect(88, 176, 24, 14, 4, '$d'),
    ],
  },
  {
    id: 'outfit-jersey',
    slot: 'body',
    label: $localize`:@@avatar.outfit.jersey:Maillot de sport`,
    shapes: [path(TORSO), line('M54 168 L45 196', '#ffffff', 5), line('M146 168 L155 196', '#ffffff', 5), line('M95 178 L102 173 V196', '#ffffff', 5)],
    front: [path('M87 151 L100 167 L113 151 Z', '#ffffff'), line('M87 151 L100 167 L113 151', '$d', 2.5)],
  },
  {
    id: 'outfit-hero',
    slot: 'body',
    label: $localize`:@@avatar.outfit.hero:Costume de super-héros`,
    shapes: [
      path('M26 200 C28 168 50 148 74 146 L126 146 C150 148 172 168 174 200 Z', '$dd'),
      path(TORSO),
      circle(100, 178, 13, '#ffffff'),
      star(100, 178.5, 9, 4, '$c'),
      rect(40, 195, 120, 5, 0, '#fbbf24'),
    ],
  },
];

export const OUTFIT_COLORS: ColorOption[] = [
  { value: '#3b82f6', label: $localize`:@@avatar.color.blue:Bleu` },
  { value: '#ef4444', label: $localize`:@@avatar.color.red:Rouge` },
  { value: '#22c55e', label: $localize`:@@avatar.color.green:Vert` },
  { value: '#eab308', label: $localize`:@@avatar.color.yellow:Jaune` },
  { value: '#8b5cf6', label: $localize`:@@avatar.color.purple:Violet` },
  { value: '#ec4899', label: $localize`:@@avatar.color.pink:Rose` },
  { value: '#f97316', label: $localize`:@@avatar.color.orange:Orange` },
  { value: '#14b8a6', label: $localize`:@@avatar.color.turquoise:Turquoise` },
  { value: '#64748b', label: $localize`:@@avatar.color.grey:Gris` },
  { value: '#1e3a8a', label: $localize`:@@avatar.color.navy:Bleu marine` },
];

// ---------- chapeaux (couleurs fixes)

export const HATS: AvatarPart[] = [
  { id: NONE, slot: 'hat', label: $localize`:@@avatar.hat.none:Pas de chapeau`, shapes: [] },
  {
    id: 'hat-cap',
    slot: 'hat',
    label: $localize`:@@avatar.hat.cap:Casquette`,
    shapes: [
      path('M58 74 C58 46 78 34 100 34 C122 34 142 46 142 74 Z', '#e53935'),
      path('M92 70 C110 64 150 64 166 75 C152 82 110 82 92 76 Z', '#b71c1c'),
      circle(100, 35, 3.5, '#b71c1c'),
    ],
  },
  {
    id: 'hat-beanie',
    slot: 'hat',
    label: $localize`:@@avatar.hat.beanie:Bonnet`,
    shapes: [path('M56 78 C56 44 76 30 100 30 C124 30 144 44 144 78 Z', '#7e57c2'), rect(54, 66, 92, 16, 8, '#5e35b1'), circle(100, 26, 10, '#ede7f6')],
  },
  {
    id: 'hat-pirate',
    slot: 'hat',
    label: $localize`:@@avatar.hat.pirate:Chapeau de pirate`,
    shapes: [
      path('M38 74 C52 44 78 60 100 32 C122 60 148 44 162 74 C128 63 72 63 38 74 Z', '#263238'),
      line('M44 71 C80 61 120 61 156 71', '#fbc02d', 2.5),
      circle(100, 52, 7, '#ffffff'),
      line('M91 64 L109 58', '#ffffff', 2.5),
      line('M91 58 L109 64', '#ffffff', 2.5),
    ],
  },
  {
    id: 'hat-crown',
    slot: 'hat',
    label: $localize`:@@avatar.hat.crown:Couronne`,
    shapes: [
      path('M64 68 L66 32 L84 50 L100 26 L116 50 L134 32 L136 68 Z', '#fbc02d'),
      rect(64, 60, 72, 10, 3, '#f9a825'),
      circle(100, 50, 4.5, '#e53935'),
      circle(80, 60, 3, '#1e88e5'),
      circle(120, 60, 3, '#1e88e5'),
    ],
  },
  {
    id: 'hat-wizard',
    slot: 'hat',
    label: $localize`:@@avatar.hat.wizard:Chapeau de sorcier`,
    shapes: [
      path('M100 4 L140 68 L60 68 Z', '#3949ab'),
      ellipse(100, 68, 52, 9, '#303f9f'),
      star(94, 42, 7, 3, '#ffd54f'),
      star(112, 58, 4, 1.8, '#ffd54f'),
      circle(100, 6, 4, '#ffd54f'),
    ],
  },
  {
    id: 'hat-hardhat',
    slot: 'hat',
    label: $localize`:@@avatar.hat.hardhat:Casque de chantier`,
    shapes: [path('M60 72 C60 44 78 32 100 32 C122 32 140 44 140 72 Z', '#fdd835'), rect(52, 68, 96, 9, 4.5, '#f9a825'), rect(95, 32, 10, 38, 4, '#fbc02d')],
  },
  {
    id: 'hat-bob',
    slot: 'hat',
    label: $localize`:@@avatar.hat.bob:Bob`,
    shapes: [path('M64 68 C66 40 82 34 100 34 C118 34 134 40 136 68 Z', '#8bc34a'), path('M48 72 C58 62 142 62 152 72 C142 82 58 82 48 72 Z', '#689f38')],
  },
  {
    id: 'hat-cowboy',
    slot: 'hat',
    label: $localize`:@@avatar.hat.cowboy:Chapeau de cow-boy`,
    shapes: [
      path('M70 64 C68 36 84 30 92 38 C96 34 104 34 108 38 C116 30 132 36 130 64 Z', '#a1887f'),
      rect(70, 56, 60, 8, 2, '#5d4037'),
      path('M34 58 C44 74 156 74 166 58 C170 54 170 50 164 52 C140 66 60 66 36 52 C30 50 30 54 34 58 Z', '#8d6e63'),
    ],
  },
];

// ---------- accessoires (couleurs fixes)

export const ACCESSORIES: AvatarPart[] = [
  { id: NONE, slot: 'accessory', label: $localize`:@@avatar.accessory.none:Pas d'accessoire`, shapes: [] },
  {
    id: 'acc-glasses',
    slot: 'accessory',
    zone: 'eyes',
    label: $localize`:@@avatar.accessory.glasses:Lunettes`,
    shapes: [
      circle(84, 90, 11, '#ffffff', { opacity: 0.2 }),
      circle(116, 90, 11, '#ffffff', { opacity: 0.2 }),
      circle(84, 90, 11, 'none', { stroke: '#37474f', sw: 3 }),
      circle(116, 90, 11, 'none', { stroke: '#37474f', sw: 3 }),
      line('M95 89 Q100 85 105 89', '#37474f', 3),
      line('M73 88 L61 85', '#37474f', 3),
      line('M127 88 L139 85', '#37474f', 3),
    ],
  },
  {
    id: 'acc-sunglasses',
    slot: 'accessory',
    zone: 'eyes',
    label: $localize`:@@avatar.accessory.sunglasses:Lunettes de soleil`,
    shapes: [
      path('M68 82 H96 V91 C96 99 90 103 83 103 C74 103 68 98 68 90 Z', '#212121'),
      path('M104 82 H132 V90 C132 98 126 103 117 103 C110 103 104 99 104 91 Z', '#212121'),
      line('M96 86 H104', '#212121', 3),
      line('M68 85 L58 83', '#212121', 3),
      line('M132 85 L142 83', '#212121', 3),
      line('M73 87 L80 87', '#ffffff', 2, { opacity: 0.5 }),
      line('M109 87 L116 87', '#ffffff', 2, { opacity: 0.5 }),
    ],
  },
  {
    id: 'acc-bowtie',
    slot: 'accessory',
    zone: 'neck',
    label: $localize`:@@avatar.accessory.bowtie:Nœud papillon`,
    shapes: [path('M100 154 L82 145 L82 163 Z', '#d32f2f'), path('M100 154 L118 145 L118 163 Z', '#d32f2f'), circle(100, 154, 4.5, '#b71c1c')],
  },
  {
    id: 'acc-scarf',
    slot: 'accessory',
    zone: 'neck',
    label: $localize`:@@avatar.accessory.scarf:Écharpe`,
    shapes: [
      path('M72 142 C88 152 112 152 128 142 L130 156 C112 166 88 166 70 156 Z', '#ef6c00'),
      path('M106 156 L118 190 L104 192 L98 160 Z', '#e65100'),
      line('M84 150 L84 160', '#ffffff', 2.5, { opacity: 0.6 }),
      line('M116 150 L116 160', '#ffffff', 2.5, { opacity: 0.6 }),
      line('M106 176 L116 174', '#ffffff', 2.5, { opacity: 0.6 }),
    ],
  },
  {
    id: 'acc-earrings',
    slot: 'accessory',
    zone: 'ears',
    label: $localize`:@@avatar.accessory.earrings:Boucles d'oreille`,
    shapes: [circle(60, 106, 3, '#ffd54f'), circle(140, 106, 3, '#ffd54f'), circle(60, 113, 3.5, '#ffb300'), circle(140, 113, 3.5, '#ffb300')],
  },
];

// ---------- fonds

export const BACKGROUND_COLORS: ColorOption[] = [
  { value: '#fde68a', label: $localize`:@@avatar.bg.lemon:Citron` },
  { value: '#bfdbfe', label: $localize`:@@avatar.bg.sky:Ciel` },
  { value: '#bbf7d0', label: $localize`:@@avatar.bg.mint:Menthe` },
  { value: '#fbcfe8', label: $localize`:@@avatar.bg.candy:Bonbon` },
  { value: '#ddd6fe', label: $localize`:@@avatar.bg.lavender:Lavande` },
  { value: '#fed7aa', label: $localize`:@@avatar.bg.apricot:Abricot` },
  { value: '#e2e8f0', label: $localize`:@@avatar.bg.pearl:Perle` },
  { value: '#99f6e4', label: $localize`:@@avatar.bg.lagoon:Lagon` },
];

export const BACKGROUND_GRADIENTS: GradientOption[] = [
  { id: 'bg-sunset', label: $localize`:@@avatar.bg.sunset:Coucher de soleil`, from: '#fde68a', to: '#f9a8d4' },
  { id: 'bg-ocean', label: $localize`:@@avatar.bg.ocean:Océan`, from: '#a5f3fc', to: '#60a5fa' },
  { id: 'bg-meadow', label: $localize`:@@avatar.bg.meadow:Prairie`, from: '#fef9c3', to: '#86efac' },
  { id: 'bg-galaxy', label: $localize`:@@avatar.bg.galaxy:Galaxie`, from: '#312e81', to: '#a855f7' },
];

// ---------- index

export const PARTS_BY_SLOT: Record<'eyes' | 'mouth' | 'hair' | 'body' | 'hat' | 'accessory', AvatarPart[]> = {
  eyes: EYES,
  mouth: MOUTHS,
  hair: HAIRS,
  body: OUTFITS,
  hat: HATS,
  accessory: ACCESSORIES,
};

export function findPart(slot: keyof typeof PARTS_BY_SLOT, id: string | undefined): AvatarPart | undefined {
  return PARTS_BY_SLOT[slot].find((p) => p.id === id);
}
