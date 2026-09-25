import { AvatarConfig } from './avatar-config';
import {
  ACCESSORIES,
  AvatarPart,
  BACKGROUND_COLORS,
  BACKGROUND_GRADIENTS,
  ColorOption,
  EYES,
  HAIRS,
  HAIR_COLORS,
  HATS,
  MOUTHS,
  NONE,
  OUTFITS,
  OUTFIT_COLORS,
  SKIN_TONES,
} from './avatar-parts';

/** Zone du personnage où une pièce se pose (surlignée pendant un glisser-déposer). */
export type DropZone = 'head' | 'face' | 'eyes' | 'mouth' | 'body' | 'hat' | 'background';

/** Une vignette ou une pastille de la garde-robe. */
export interface WardrobeOption {
  /** Unique dans toute la garde-robe. */
  key: string;
  label: string;
  zone: DropZone;
  apply(config: AvatarConfig): AvatarConfig;
  isSelected(config: AvatarConfig): boolean;
  /** Pastille : couleur (ou dégradé CSS) à afficher. Vignette : absent. */
  swatch?: string;
  /** Option « aucun » (chapeau, accessoire). */
  none?: boolean;
}

export interface WardrobeGroup {
  id: string;
  title: string;
  kind: 'thumbs' | 'swatches';
  /** Cadrage des vignettes (viewBox) sur la zone utile. */
  viewBox?: string;
  options: WardrobeOption[];
}

export interface WardrobeCategory {
  id: 'face' | 'hair' | 'outfit' | 'hat' | 'accessory' | 'background';
  label: string;
  icon: string;
  groups: WardrobeGroup[];
}

type PartField = 'eyes' | 'mouth' | 'hair' | 'outfit' | 'hat' | 'accessory';
type ColorField = 'hairColor' | 'outfitColor' | 'background';

function parts(field: PartField, list: AvatarPart[], zone: DropZone): WardrobeOption[] {
  return list.map((part) => ({
    key: `${field}:${part.id}`,
    label: part.label,
    zone,
    none: part.id === NONE,
    apply: (c) => ({ ...c, [field]: part.id }),
    isSelected: (c) => c[field] === part.id,
  }));
}

function colors(field: ColorField, list: ColorOption[], zone: DropZone): WardrobeOption[] {
  return list.map((color) => ({
    key: `${field}:${color.value}`,
    label: color.label,
    zone,
    swatch: color.value,
    apply: (c) => ({ ...c, [field]: color.value }),
    isSelected: (c) => c[field].toLowerCase() === color.value.toLowerCase(),
  }));
}

/** Catégories de la garde-robe, dans l'ordre des onglets. */
export const WARDROBE: WardrobeCategory[] = [
  {
    id: 'face',
    label: $localize`:@@avatar.cat.face:Visage`,
    icon: 'face',
    groups: [
      {
        id: 'skin',
        title: $localize`:@@avatar.group.skin:Teint`,
        kind: 'swatches',
        options: SKIN_TONES.map((tone) => ({
          key: `skin:${tone.id}`,
          label: tone.label,
          zone: 'face' as const,
          swatch: tone.value,
          apply: (c: AvatarConfig) => ({ ...c, skin: tone.id }),
          isSelected: (c: AvatarConfig) => c.skin === tone.id,
        })),
      },
      { id: 'eyes', title: $localize`:@@avatar.group.eyes:Yeux`, kind: 'thumbs', viewBox: '55 55 90 90', options: parts('eyes', EYES, 'eyes') },
      { id: 'mouth', title: $localize`:@@avatar.group.mouth:Bouche`, kind: 'thumbs', viewBox: '55 55 90 90', options: parts('mouth', MOUTHS, 'mouth') },
    ],
  },
  {
    id: 'hair',
    label: $localize`:@@avatar.cat.hair:Cheveux`,
    icon: 'content_cut',
    groups: [
      { id: 'hair', title: $localize`:@@avatar.group.hairStyle:Coiffure`, kind: 'thumbs', viewBox: '20 10 160 160', options: parts('hair', HAIRS, 'head') },
      { id: 'hairColor', title: $localize`:@@avatar.group.color:Couleur`, kind: 'swatches', options: colors('hairColor', HAIR_COLORS, 'head') },
    ],
  },
  {
    id: 'outfit',
    label: $localize`:@@avatar.cat.outfit:Habits`,
    icon: 'checkroom',
    groups: [
      { id: 'outfit', title: $localize`:@@avatar.group.outfit:Habit`, kind: 'thumbs', viewBox: '20 80 160 120', options: parts('outfit', OUTFITS, 'body') },
      { id: 'outfitColor', title: $localize`:@@avatar.group.color:Couleur`, kind: 'swatches', options: colors('outfitColor', OUTFIT_COLORS, 'body') },
    ],
  },
  {
    id: 'hat',
    label: $localize`:@@avatar.cat.hat:Chapeau`,
    icon: 'school',
    groups: [{ id: 'hat', title: $localize`:@@avatar.group.hat:Chapeau`, kind: 'thumbs', viewBox: '20 0 160 160', options: parts('hat', HATS, 'hat') }],
  },
  {
    id: 'accessory',
    label: $localize`:@@avatar.cat.accessory:Accessoires`,
    icon: 'eyeglasses',
    groups: [
      {
        id: 'accessory',
        title: $localize`:@@avatar.group.accessory:Accessoire`,
        kind: 'thumbs',
        viewBox: '30 40 140 140',
        options: parts('accessory', ACCESSORIES, 'face'),
      },
    ],
  },
  {
    id: 'background',
    label: $localize`:@@avatar.cat.background:Fond`,
    icon: 'wallpaper',
    groups: [
      {
        id: 'background',
        title: $localize`:@@avatar.group.background:Fond`,
        kind: 'swatches',
        options: [
          ...colors('background', BACKGROUND_COLORS, 'background'),
          ...BACKGROUND_GRADIENTS.map((g) => ({
            key: `background:${g.id}`,
            label: g.label,
            zone: 'background' as const,
            swatch: `linear-gradient(${g.from}, ${g.to})`,
            apply: (c: AvatarConfig) => ({ ...c, background: g.id }),
            isSelected: (c: AvatarConfig) => c.background === g.id,
          })),
        ],
      },
    ],
  },
];
