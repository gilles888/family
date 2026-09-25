import {
  ACCESSORIES,
  BACKGROUND_COLORS,
  BACKGROUND_GRADIENTS,
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
import { isHexColor, lighten } from '../shared/svg/shapes';

/** Version du catalogue : à incrémenter si le sens d'un champ change (les ids retirés, eux, sont tolérés). */
export const AVATAR_VERSION = 1;

/** Personnage d'un membre, tel qu'enregistré par le backend (champ avatarConfig). */
export interface AvatarConfig {
  version: number;
  skin: string;
  eyes: string;
  mouth: string;
  hair: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  hat: string;
  accessory: string;
  /** Couleur #RRGGBB ou id d'un dégradé (BACKGROUND_GRADIENTS). */
  background: string;
}

/**
 * Config complète et sûre à partir de ce que renvoie le serveur : chaque champ inconnu (pièce retirée du catalogue,
 * couleur mal formée, ancienne version) prend la valeur de `fallback`.
 */
export function normalizeAvatar(raw: unknown, fallback: AvatarConfig): AvatarConfig {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const r = raw as Record<string, unknown>;
  const pick = (key: keyof AvatarConfig, valid: (v: unknown) => boolean) => (valid(r[key]) ? (r[key] as string) : fallback[key]);
  const among = (ids: string[]) => (v: unknown) => typeof v === 'string' && ids.includes(v);
  return {
    version: AVATAR_VERSION,
    skin: pick('skin', among(SKIN_TONES.map((s) => s.id))) as string,
    eyes: pick('eyes', among(EYES.map((p) => p.id))) as string,
    mouth: pick('mouth', among(MOUTHS.map((p) => p.id))) as string,
    hair: pick('hair', among(HAIRS.map((p) => p.id))) as string,
    hairColor: pick('hairColor', isHexColor) as string,
    outfit: pick('outfit', among(OUTFITS.map((p) => p.id))) as string,
    outfitColor: pick('outfitColor', isHexColor) as string,
    hat: pick('hat', among(HATS.map((p) => p.id))) as string,
    accessory: pick('accessory', among(ACCESSORIES.map((p) => p.id))) as string,
    background: pick('background', (v) => isHexColor(v) || among(BACKGROUND_GRADIENTS.map((g) => g.id))(v)) as string,
  };
}

/**
 * Avatar par défaut d'un membre sans personnage : toujours le même pour un même id (tirage pseudo-aléatoire à
 * partir de l'id), sans chapeau ni accessoire, sur un fond clair de la couleur du membre.
 */
export function defaultAvatar(seed: number, memberColor?: string): AvatarConfig {
  const avatar = randomAvatar(seededRandom(seed));
  return {
    ...avatar,
    hat: NONE,
    accessory: NONE,
    background: isHexColor(memberColor) ? lighten(memberColor, 0.6) : avatar.background,
  };
}

/** Avatar tiré au hasard (bouton « Surprise ! »), chapeau et accessoire compris. */
export function randomAvatar(random: () => number = Math.random): AvatarConfig {
  const any = <T>(list: T[]): T => list[Math.floor(random() * list.length)];
  return {
    version: AVATAR_VERSION,
    skin: any(SKIN_TONES).id,
    eyes: any(EYES).id,
    mouth: any(MOUTHS).id,
    hair: any(HAIRS).id,
    hairColor: any(HAIR_COLORS).value,
    outfit: any(OUTFITS).id,
    outfitColor: any(OUTFIT_COLORS).value,
    hat: any(HATS).id,
    accessory: any(ACCESSORIES).id,
    background: any([...BACKGROUND_COLORS.map((c) => c.value), ...BACKGROUND_GRADIENTS.map((g) => g.id)]),
  };
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
