import { SeasonId } from '../theme/seasons';
import { Shape } from '../shared/svg/shapes';

/** Emplacements : une pièce posée va toujours au sien. */
export type AvatarSlot =
  | 'background'
  | 'body'
  | 'head'
  | 'eyes'
  | 'mouth'
  | 'hair'
  | 'hat'
  | 'accessory'
  | 'costume'
  | 'face'
  | 'back'
  | 'held';

/** Zone du personnage où une pièce s'aimante (surlignée pendant un glisser-déposer). */
export type DropZone =
  'hair' | 'hat' | 'face' | 'eyes' | 'mouth' | 'ears' | 'neck' | 'body' | 'background';

/** Rareté : fixe le barème de la boutique (prix dans boutique/catalogue.json côté serveur). */
export type Rarete = 'commun' | 'rare' | 'super';

/** Métadonnées communes aux pièces et aux dégradés de fond. */
export interface PartMeta {
  /** Pièce de thème : toujours visible, mise en avant pendant ce thème. */
  theme?: SeasonId;
  rarete?: Rarete;
  /** Gratuite et possédée d'office (prix 0 dans le catalogue du serveur). */
  free?: boolean;
}

export interface AvatarPart extends PartMeta {
  id: string;
  label: string;
  slot: AvatarSlot;
  /** Calque principal. */
  shapes: Shape[];
  /** Cheveux : partie derrière la tête (cheveux longs, afro…). */
  back?: Shape[];
  /** Habits et déguisements : partie devant le cou (col, capuche…), dessinée après la tête. */
  front?: Shape[];
  /** Déguisements : coiffe ou accessoire dessiné au calque du chapeau (donc par-dessus les yeux). */
  headwear?: Shape[];
  /** Accessoires : zone où il se pose (lunettes → yeux, nœud papillon → cou…). */
  zone?: DropZone;
  /** Déguisement : cache les cheveux. */
  hidesHair?: boolean;
  /** Déguisement : cache le chapeau choisi. */
  hidesHat?: boolean;
  /** Déguisement : apporte sa propre coiffe (`headwear`), le chapeau choisi est donc caché. */
  includesHat?: boolean;
}

export interface ColorOption {
  value: string;
  label: string;
}

export interface GradientOption extends PartMeta {
  /** Enregistré tel quel dans l'avatar (champ background), à la place d'une couleur. */
  id: string;
  label: string;
  from: string;
  to: string;
}

export const NONE = 'none';
