/*
 * Catalogue des pièces d'avatar : dessins originaux, style cartoon plat et arrondi, viewBox commun 0 0 200 200.
 * Tête centrée en (100, 90), yeux à y = 90, bouche vers y = 110, épaules à partir de y = 150.
 *
 * Ajouter une pièce : une entrée dans la liste de son emplacement (id stable, jamais réutilisé : il est enregistré
 * dans les avatars des membres), libellé traduit ($localize + messages.nl.xlf). Retirer une pièce : les avatars qui
 * l'utilisaient retombent sur la pièce par défaut de l'emplacement (normalizeAvatar), sans erreur.
 */
import { INK, Shape, circle, ellipse, line, path, rect } from './avatar-shapes';

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

export const EYES: AvatarPart[] = [
  {
    id: 'eyes-round',
    slot: 'eyes',
    label: $localize`:@@avatar.eyes.round:Yeux ronds`,
    shapes: [circle(84, 90, 5.5, INK), circle(116, 90, 5.5, INK), circle(86, 88, 1.8, '#ffffff'), circle(118, 88, 1.8, '#ffffff')],
  },
  {
    id: 'eyes-happy',
    slot: 'eyes',
    label: $localize`:@@avatar.eyes.happy:Yeux rieurs`,
    shapes: [line('M77 93 Q84 84 91 93'), line('M109 93 Q116 84 123 93')],
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
];

export const HAIR_COLORS: ColorOption[] = [
  { value: '#2b2118', label: $localize`:@@avatar.color.black:Noir` },
  { value: '#6b3e26', label: $localize`:@@avatar.color.brown:Brun` },
  { value: '#e8c267', label: $localize`:@@avatar.color.blond:Blond` },
  { value: '#d9772b', label: $localize`:@@avatar.color.ginger:Roux` },
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
];

export const OUTFIT_COLORS: ColorOption[] = [
  { value: '#3b82f6', label: $localize`:@@avatar.color.blue:Bleu` },
  { value: '#ef4444', label: $localize`:@@avatar.color.red:Rouge` },
  { value: '#22c55e', label: $localize`:@@avatar.color.green:Vert` },
  { value: '#eab308', label: $localize`:@@avatar.color.yellow:Jaune` },
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
];

// ---------- fonds

export const BACKGROUND_COLORS: ColorOption[] = [
  { value: '#fde68a', label: $localize`:@@avatar.bg.lemon:Citron` },
  { value: '#bfdbfe', label: $localize`:@@avatar.bg.sky:Ciel` },
  { value: '#bbf7d0', label: $localize`:@@avatar.bg.mint:Menthe` },
  { value: '#fbcfe8', label: $localize`:@@avatar.bg.candy:Bonbon` },
];

export const BACKGROUND_GRADIENTS: GradientOption[] = [];

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
