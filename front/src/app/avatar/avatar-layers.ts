import { AvatarConfig } from './avatar-config';
import { BACKGROUND_GRADIENTS, GradientOption, HEAD_SHAPES, SKIN_TONES, findPart } from './avatar-parts';
import { PaintContext, Shape, resolvePaint } from '../shared/svg/shapes';

/**
 * Calques, du fond vers l'avant. Les cheveux « arrière » passent derrière la tête (sinon ils couvriraient le
 * visage) ; le col des habits passe devant le cou.
 */
export const LAYER_ORDER = [
  'background',
  'body',
  'hair-back',
  'head',
  'body-front',
  'eyes',
  'mouth',
  'hair-front',
  'hat',
  'accessory',
] as const;
export type LayerKey = (typeof LAYER_ORDER)[number];

/** Forme prête à dessiner : couleurs résolues. */
export type ResolvedShape = Shape;

export interface AvatarLayer {
  key: LayerKey;
  /** Pièce dessinée (id du catalogue), pour les tests et le débogage. */
  part: string;
  shapes: ResolvedShape[];
}

export interface AvatarDrawing {
  /** Fond uni, ou dégradé à déclarer dans <defs>. */
  background: { color: string } | { gradient: GradientOption };
  layers: AvatarLayer[];
}

/** Traduit une config (déjà normalisée) en calques SVG. */
export function drawAvatar(config: AvatarConfig): AvatarDrawing {
  const skin = SKIN_TONES.find((s) => s.id === config.skin)?.value ?? SKIN_TONES[0].value;
  const ctx = (color: string): PaintContext => ({ color, skin, hair: config.hairColor });
  const hair = findPart('hair', config.hair);
  const outfit = findPart('body', config.outfit);
  const gradient = BACKGROUND_GRADIENTS.find((g) => g.id === config.background);

  const layers: AvatarLayer[] = [
    layer('body', config.outfit, outfit?.shapes, ctx(config.outfitColor)),
    layer('hair-back', config.hair, hair?.back, ctx(config.hairColor)),
    layer('head', config.skin, HEAD_SHAPES, ctx(skin)),
    layer('body-front', config.outfit, outfit?.front, ctx(config.outfitColor)),
    layer('eyes', config.eyes, findPart('eyes', config.eyes)?.shapes, ctx(skin)),
    layer('mouth', config.mouth, findPart('mouth', config.mouth)?.shapes, ctx(skin)),
    layer('hair-front', config.hair, hair?.shapes, ctx(config.hairColor)),
    layer('hat', config.hat, findPart('hat', config.hat)?.shapes, ctx(config.hairColor)),
    layer('accessory', config.accessory, findPart('accessory', config.accessory)?.shapes, ctx(config.hairColor)),
  ].filter((l) => l.shapes.length > 0);

  return { background: gradient ? { gradient } : { color: config.background }, layers };
}

function layer(key: LayerKey, part: string, shapes: Shape[] | undefined, ctx: PaintContext): AvatarLayer {
  return {
    key,
    part,
    shapes: (shapes ?? []).map((s) => ({ ...s, fill: resolvePaint(s.fill, ctx), stroke: resolvePaint(s.stroke, ctx) })),
  };
}
