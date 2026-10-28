import { AvatarConfig, DEFAULT_EYE_COLOR } from './avatar-config';
import {
  BACKGROUND_GRADIENTS,
  GradientOption,
  HEAD_SHAPES,
  NONE,
  SKIN_TONES,
  findPart,
} from './avatar-parts';
import { PaintContext, Shape, isHexColor, resolvePaint } from '../shared/svg/shapes';

/**
 * Calques, du fond vers l'avant. Les cheveux « arrière » passent derrière la tête (sinon ils couvriraient le
 * visage) ; le col des habits passe devant le cou.
 */
export const LAYER_ORDER = [
  'background',
  'back',
  'body',
  'hair-back',
  'head',
  'body-front',
  'face',
  'eyes',
  'mouth',
  'hair-front',
  'hat',
  'accessory',
  'held',
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

/** Options de rendu : la couleur du membre sert à certains objets (le ballon). */
export interface DrawOptions {
  memberColor?: string;
}

/**
 * Traduit une config (déjà normalisée) en calques SVG. Un déguisement remplace la tenue (calques « body » et
 * « body-front »), et selon ses drapeaux cache les cheveux et le chapeau, ou apporte sa propre coiffe.
 */
export function drawAvatar(config: AvatarConfig, options: DrawOptions = {}): AvatarDrawing {
  const skin = SKIN_TONES.find((s) => s.id === config.skin)?.value ?? SKIN_TONES[0].value;
  const ctx = (color: string): PaintContext => ({ color, skin, hair: config.hairColor });
  const costume =
    config.costume && config.costume !== NONE ? findPart('costume', config.costume) : undefined;
  const hair = costume?.hidesHair ? undefined : findPart('hair', config.hair);
  const outfit = costume ?? findPart('body', config.outfit);
  const hat = costume?.includesHat || costume?.hidesHat ? undefined : findPart('hat', config.hat);
  const gradient = BACKGROUND_GRADIENTS.find((g) => g.id === config.background);
  const outfitColor = ctx(config.outfitColor);
  const memberColor = isHexColor(options.memberColor) ? options.memberColor : config.outfitColor;

  const layers: AvatarLayer[] = [
    layer(
      'back',
      config.back ?? NONE,
      findPart('back', config.back)?.shapes,
      ctx(config.outfitColor),
    ),
    layer('body', costume ? costume.id : config.outfit, outfit?.shapes, outfitColor),
    layer('hair-back', config.hair, hair?.back, ctx(config.hairColor)),
    layer('head', config.skin, HEAD_SHAPES, ctx(skin)),
    layer('body-front', costume ? costume.id : config.outfit, outfit?.front, outfitColor),
    layer('face', config.face ?? NONE, findPart('face', config.face)?.shapes, ctx(skin)),
    layer(
      'eyes',
      config.eyes,
      findPart('eyes', config.eyes)?.shapes,
      ctx(config.eyeColor ?? DEFAULT_EYE_COLOR),
    ),
    layer('mouth', config.mouth, findPart('mouth', config.mouth)?.shapes, ctx(skin)),
    layer('hair-front', config.hair, hair?.shapes, ctx(config.hairColor)),
    layer(
      'hat',
      costume?.includesHat ? costume.id : config.hat,
      costume?.includesHat ? costume.headwear : hat?.shapes,
      ctx(config.hairColor),
    ),
    layer(
      'accessory',
      config.accessory,
      findPart('accessory', config.accessory)?.shapes,
      ctx(config.hairColor),
    ),
    layer('held', config.held ?? NONE, findPart('held', config.held)?.shapes, ctx(memberColor)),
  ].filter((l) => l.shapes.length > 0);

  return { background: gradient ? { gradient } : { color: config.background }, layers };
}

function layer(
  key: LayerKey,
  part: string,
  shapes: Shape[] | undefined,
  ctx: PaintContext,
): AvatarLayer {
  return {
    key,
    part,
    shapes: (shapes ?? []).map((s) => ({
      ...s,
      fill: resolvePaint(s.fill, ctx),
      stroke: resolvePaint(s.stroke, ctx),
    })),
  };
}
