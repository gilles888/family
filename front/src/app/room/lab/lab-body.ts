import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarConfig } from '../../avatar/avatar-config';
import { AvatarLayer, drawAvatar } from '../../avatar/avatar-layers';
import { SKIN_TONES } from '../../avatar/avatar-parts';
import { Shape, circle, darken, ellipse, lighten, path, rect } from '../../shared/svg/shapes';
import { SvgShapes } from '../../shared/svg/svg-shapes';

/** Deux proportions maquettées : la tête fait ~40 % (chibi) ou ~30 % (enfant) de la hauteur totale. */
export type Proportion = 'chibi' | 'enfant';

/** Repères du corps (espace 200 × 300, pieds en y = 290) : tête, cou, épaules, taille, hanches, genoux, chevilles. */
interface Anchors {
  /** Échelle de la tête (les calques de tête sont dessinés dans 200 × 200, menton en y = 133). */
  headScale: number;
  chin: number;
  shoulderY: number;
  waistY: number;
  hipY: number;
  kneeY: number;
  ankleY: number;
  footY: number;
  shoulderW: number;
  waistW: number;
  hipW: number;
  armLen: number;
  armW: number;
}

export const ANCHORS: Record<Proportion, Anchors> = {
  chibi: { headScale: 1.23, chin: 120, shoulderY: 130, waistY: 184, hipY: 202, kneeY: 242, ankleY: 274, footY: 290, shoulderW: 38, waistW: 31, hipW: 34, armLen: 60, armW: 13 },
  enfant: { headScale: 0.97, chin: 96, shoulderY: 107, waistY: 170, hipY: 190, kneeY: 238, ankleY: 273, footY: 290, shoulderW: 37, waistW: 29, hipW: 33, armLen: 66, armW: 12 },
};

export const FIGURE_W = 200;
export const FIGURE_H = 300;

/** Pantalon par défaut ; manches selon la tenue. */
const LONG_SLEEVES = ['outfit-sweater', 'outfit-hoodie', 'outfit-shirt', 'outfit-puffer', 'outfit-raincoat'];
const BARE_ARMS = ['outfit-dress', 'outfit-swimsuit'];

interface Look {
  skin: string;
  top: string;
  pants: string;
  accent: string;
  sleeve: 'short' | 'long' | 'none';
  skirt: boolean;
}

function lookOf(config: AvatarConfig): Look {
  const skin = SKIN_TONES.find((s) => s.id === config.skin)?.value ?? SKIN_TONES[0].value;
  const dress = config.outfit === 'outfit-dress';
  return {
    skin,
    top: config.outfitColor,
    pants: dress ? config.outfitColor : '#4f63a8',
    accent: darken(config.outfitColor, 0.05),
    sleeve: BARE_ARMS.includes(config.outfit) ? 'none' : LONG_SLEEVES.includes(config.outfit) ? 'long' : 'short',
    skirt: dress,
  };
}

/** Corps entier : jambes, chaussures, buste aux épaules rondes, bras et mains, ombre au sol. Sans contour, volume par ombres. */
export function bodyShapes(a: Anchors, look: Look): { back: Shape[]; front: Shape[] } {
  const cx = 100;
  const { skin, top, pants, accent } = look;
  const shade = (d: string, id = 'fig-shade', opacity = 1): Shape => path(d, `url(#${id})`, { opacity });
  const back: Shape[] = [ellipse(cx, a.footY + 2, 58, 9, '#2b1a3a', { opacity: 0.22 })];

  // jambes un peu effilées ; jupe pour la robe
  const leg = (side: -1 | 1): Shape[] => {
    const outer = cx + side * a.hipW;
    const inner = cx + side * 2.5;
    const ankleO = cx + side * 19;
    const ankleI = cx + side * 7;
    const d = `M ${outer} ${a.hipY - 4} L ${inner} ${a.hipY - 4} Q ${inner + side * -1} ${a.kneeY} ${ankleI} ${a.ankleY} L ${ankleO} ${a.ankleY} Q ${outer - side * 1} ${a.kneeY} ${outer} ${a.hipY - 4} Z`;
    const shoeX = cx + side * 14;
    const toe = cx + side * 21;
    return [
      path(d, look.skirt ? skin : pants),
      shade(d),
      // chaussure : dessus arrondi, semelle claire, touche de couleur sur le bout
      ellipse(shoeX + side * 3, a.footY - 8, 17, 10, '#fafafa'),
      path(`M ${shoeX - 14} ${a.footY - 3} Q ${shoeX + side * 3} ${a.footY + 5} ${shoeX + 20} ${a.footY - 3} L ${shoeX + 20} ${a.footY - 1} Q ${shoeX + side * 3} ${a.footY + 7} ${shoeX - 14} ${a.footY - 1} Z`, '#cfd8dc'),
      ellipse(toe, a.footY - 9, 8, 6.5, accent),
      ellipse(shoeX + side * 3, a.footY - 8, 17, 10, `url(#fig-shade)`, { opacity: 0.6 }),
    ];
  };
  back.push(...leg(-1), ...leg(1));

  // bras : manche (haut du bras), avant-bras, main arrondie avec pouce
  const arm = (side: -1 | 1): Shape[] => {
    const sx = cx + side * (a.shoulderW - 5);
    const sy = a.shoulderY + 12;
    const ex = cx + side * (a.shoulderW + 4);
    const ey = sy + a.armLen * 0.52;
    const wx = cx + side * (a.shoulderW + 8);
    const wy = sy + a.armLen;
    const stroke = (d: string, col: string, w: number): Shape => path(d, 'none', { stroke: col, sw: w });
    const out: Shape[] = [];
    out.push(stroke(`M ${sx} ${sy} Q ${ex + side * 1} ${ey - 4} ${ex} ${ey}`, skin, a.armW - 1));
    out.push(stroke(`M ${ex} ${ey} Q ${wx} ${ey + 8} ${wx} ${wy}`, skin, a.armW - 2));
    out.push(circle(wx + side * 0.5, wy + 5, a.armW * 0.62, skin));
    out.push(ellipse(wx - side * 4.5, wy + 2, 3.6, 5.8, skin));
    if (look.sleeve !== 'none') {
      const reach = look.sleeve === 'long' ? 0.92 : 0.5;
      const mx = sx + (wx - sx) * reach * 0.7 + (ex - sx) * (look.sleeve === 'long' ? 0.5 : 0.35);
      const my = sy + (wy - sy) * reach;
      out.push(stroke(`M ${sx} ${sy} Q ${ex + side * 2} ${ey - 2} ${look.sleeve === 'long' ? wx : mx} ${look.sleeve === 'long' ? wy - 4 : my}`, top, a.armW + 2.5));
      out.push(stroke(`M ${sx} ${sy} Q ${ex + side * 2} ${ey - 2} ${look.sleeve === 'long' ? wx : mx} ${look.sleeve === 'long' ? wy - 4 : my}`, 'url(#fig-shade)', a.armW + 2.5));
    }
    return out;
  };

  // buste : épaules rondes, taille, hanches
  const sy = a.shoulderY;
  const torso = (p: { sw: number; ww: number; hw: number }) =>
    `M ${cx - 11} ${sy - 3} Q ${cx - p.sw + 2} ${sy - 4} ${cx - p.sw} ${sy + 12} L ${cx - p.ww} ${a.waistY} Q ${cx - p.hw - 2} ${a.hipY - 8} ${cx - p.hw} ${a.hipY + 2} L ${cx + p.hw} ${a.hipY + 2} Q ${cx + p.hw + 2} ${a.hipY - 8} ${cx + p.ww} ${a.waistY} L ${cx + p.sw} ${sy + 12} Q ${cx + p.sw - 2} ${sy - 4} ${cx + 11} ${sy - 3} Z`;
  const body = torso({ sw: a.shoulderW, ww: a.waistW, hw: a.hipW });
  back.push(...arm(-1), ...arm(1));
  back.push(path(body, top), shade(body), path(body, 'url(#fig-shade-v)'));
  if (look.skirt) {
    const skirt = `M ${cx - a.waistW} ${a.waistY - 2} L ${cx + a.waistW} ${a.waistY - 2} L ${cx + a.hipW + 16} ${a.kneeY - 6} Q ${cx} ${a.kneeY + 4} ${cx - a.hipW - 16} ${a.kneeY - 6} Z`;
    back.push(path(skirt, top), shade(skirt), path(`M ${cx - a.hipW - 14} ${a.kneeY - 8} Q ${cx} ${a.kneeY + 2} ${cx + a.hipW + 14} ${a.kneeY - 8}`, 'none', { stroke: lighten(top, 0.3), sw: 2 }));
  } else {
    // ceinture et ourlet du haut
    back.push(rect(cx - a.hipW - 1, a.hipY - 6, a.hipW * 2 + 2, 6, 3, darken(top, 0.18)));
  }

  // devant : encolure ronde qui cache le bas du cou, ombre sous le menton
  const front: Shape[] = [
    path(`M ${cx - 17} ${sy - 4} Q ${cx} ${sy + 15} ${cx + 17} ${sy - 4} L ${cx + 22} ${sy + 8} L ${cx - 22} ${sy + 8} Z`, top),
    path(`M ${cx - 17} ${sy - 4} Q ${cx} ${sy + 15} ${cx + 17} ${sy - 4}`, 'none', { stroke: darken(top, 0.2), sw: 2.2 }),
    ellipse(cx, a.chin + 6 * a.headScale, 19 * a.headScale, 7 * a.headScale, '#4a2a1a', { opacity: 0.2 }),
  ];
  return { back, front };
}

/** Les calques de tête de drawAvatar (le corps, le dos, l'objet tenu et le buste d'origine sont remplacés ou omis). */
function headLayers(config: AvatarConfig): AvatarLayer[] {
  return drawAvatar(config).layers.filter((l) => !['back', 'body', 'body-front', 'held'].includes(l.key));
}

/**
 * Personnage entier (maquette) : le corps de bodyShapes() + les calques de tête de l'avatar, mis à l'échelle de la
 * proportion choisie. S'insère dans un <svg> avec `<g labFigure …>`, ses pieds au point (100, 290) de son espace 200 × 300.
 */
@Component({
  selector: 'g[labFigure]',
  imports: [SvgShapes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg:g [appShapes]="body().back"></svg:g>
    @for (layer of head().before; track layer.key) {
      <svg:g [attr.transform]="headTransform()" [appShapes]="layer.shapes"></svg:g>
    }
    <svg:g [appShapes]="body().front"></svg:g>
    @for (layer of head().after; track layer.key) {
      <svg:g [attr.transform]="headTransform()" [appShapes]="layer.shapes"></svg:g>
    }
  `,
})
export class LabFigure {
  readonly config = input.required<AvatarConfig>();
  readonly proportion = input<Proportion>('enfant');

  protected readonly anchors = computed(() => ANCHORS[this.proportion()]);
  protected readonly body = computed(() => bodyShapes(this.anchors(), lookOf(this.config())));
  protected readonly head = computed(() => {
    const layers = headLayers(this.config());
    const i = layers.findIndex((l) => l.key === 'head');
    return { before: layers.slice(0, i + 1), after: layers.slice(i + 1) };
  });
  /** Le menton reste fixe : x' = 100 + (x − 100)·s, y' = menton + (y − 133)·s. */
  protected readonly headTransform = computed(() => {
    const a = this.anchors();
    const s = a.headScale;
    return `translate(${100 - 100 * s} ${a.chin - 133 * s}) scale(${s})`;
  });
}
