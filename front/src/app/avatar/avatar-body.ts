/*
 * Le corps du personnage : un seul dessin « enfant » (tête ≈ 30 % de la hauteur), dans un espace de 200 × 300, pieds en
 * (100, 290). Toutes les pièces se placent par rapport aux repères (ANCHORS) ; les pièces de tête restent dessinées
 * dans leur espace d'origine (200 × 200, menton en y = 133) et sont posées sur le corps par HEAD_TRANSFORM.
 * Le buste affiché ailleurs (avatars ronds) est un recadrage (BUST_FRAME, HEAD_FRAME) de ce même corps entier.
 */
import { Shape, circle, darken, ellipse, lighten, path, rect } from '../shared/svg/shapes';
import { DropZone } from './avatar-part-types';

export const BODY_W = 200;
export const BODY_H = 300;
/** Personnage entier, avec de la place au-dessus de la tête pour les coiffes hautes (oreilles de lapin, pointe de sorcier). */
export const BODY_TOP = -36;
export const BODY_FULL_H = BODY_H - BODY_TOP;
export const BODY_FRAME = `0 ${BODY_TOP} ${BODY_W} ${BODY_FULL_H}`;
/** Buste : tête, épaules et haut du torse (carré). */
export const BUST_FRAME = '20 0 160 160';
/** Tête et haut des épaules (mini-avatars). */
export const HEAD_FRAME = '40 0 120 120';

/** Les pièces de tête sont dessinées dans 200 × 200, menton en y = 133. */
const HEAD_CHIN = 133;
const HEAD_SCALE = 0.94;
/** Échelle des dessins posés sur le corps (têtes, objets tenus). */
export const HEAD_SCALE_VALUE = HEAD_SCALE;
const CHIN_Y = 98;

/** Transformation qui pose un dessin de tête (espace 200 × 200) sur le corps. */
/** Pose de repos : la tête est un peu inclinée (rotation autour du menton). */
const HEAD_TILT = -3;
export const HEAD_TRANSFORM = `translate(${100 - 100 * HEAD_SCALE} ${CHIN_Y - HEAD_CHIN * HEAD_SCALE}) scale(${HEAD_SCALE}) rotate(${HEAD_TILT} 100 ${HEAD_CHIN})`;

/** Point de l'espace de tête → espace du corps. */
export function headPoint(x: number, y: number): [number, number] {
  return [100 + (x - 100) * HEAD_SCALE, CHIN_Y + (y - HEAD_CHIN) * HEAD_SCALE];
}

/** Rectangle [x, y, l, h] de l'espace de tête → espace du corps. */
export function headRect([x, y, w, h]: readonly [number, number, number, number]): [number, number, number, number] {
  const [bx, by] = headPoint(x, y);
  // jamais au-dessus du cadre
  const top = Math.max(0, by);
  return [round(bx), round(top), round(w * HEAD_SCALE), round(h * HEAD_SCALE - (top - by))];
}

/** viewBox « x y l h » de l'espace de tête → espace du corps (cadrage des vignettes). */
export function headViewBox(viewBox: string): string {
  const [x, y, w, h] = viewBox.split(' ').map(Number);
  return headRect([x, y, w, h]).join(' ');
}

const round = (n: number) => Math.round(n * 10) / 10;

export type Point = readonly [number, number];

/** Repères du corps. Gauche / droite sont ceux de l'écran. */
export const ANCHORS = {
  chin: [100, CHIN_Y] as Point,
  neck: [100, 106] as Point,
  shoulderL: [63, 123] as Point,
  shoulderR: [137, 123] as Point,
  elbowL: [48, 155] as Point,
  elbowR: [152, 155] as Point,
  /** Centre de la paume : les objets tenus s'y posent. */
  handL: [51, 193] as Point,
  handR: [149, 193] as Point,
  waist: [100, 174] as Point,
  hipL: [67, 194] as Point,
  hipR: [133, 194] as Point,
  kneeL: [86, 239] as Point,
  kneeR: [114, 239] as Point,
  footL: [86, 290] as Point,
  footR: [114, 290] as Point,
} as const;

/** Mesures du corps (espace 200 × 300). */
const M = {
  shoulderY: 111,
  waistY: 174,
  hipY: 194,
  kneeY: 239,
  ankleY: 273,
  footY: 290,
  shoulderW: 37,
  waistW: 29,
  hipW: 33,
  armLen: 64,
  armW: 12,
};

/** Rectangle [x, y, largeur, hauteur] de chaque zone, dans l'espace du corps (200 × 300). */
export const ZONES: Record<DropZone, readonly [number, number, number, number]> = {
  hair: headRect([42, 26, 116, 112]),
  hat: [34, 0, 132, 77],
  face: headRect([56, 46, 88, 90]),
  eyes: headRect([62, 74, 76, 32]),
  mouth: headRect([78, 98, 44, 30]),
  ears: headRect([44, 82, 112, 34]),
  neck: [72, 96, 56, 26],
  body: [52, 106, 96, 94],
  background: [0, 0, BODY_W, BODY_H],
};

/** Ce que l'habit change sur le corps de base. Les couleurs peuvent être des jetons ($c, $d…) ou fixes. */
export interface Garment {
  sleeve: 'short' | 'long' | 'none';
  /** Bas : pantalon (par défaut), short ou jupe évasée (robe). */
  bottom?: 'pants' | 'shorts' | 'skirt';
  /** Couleur du haut, si l'habit en impose une (sinon la couleur de tenue choisie). */
  top?: string;
  /** Couleur du bas (sinon jean pour pantalon et short, couleur du haut pour la jupe). */
  pants?: string;
  /** Le déguisement cache tout le corps (fantôme, sapin, bonhomme de neige) : seule son ombre au sol reste. */
  hideBody?: boolean;
}

/** Épaisseur du contour de la peau (espace du corps ; celui de la tête, mis à l'échelle, est presque identique). */
const OUTLINE_W = 2.3;

export const DEFAULT_GARMENT: Garment = { sleeve: 'short' };

/** Ids des dégradés d'ombrage (à définir dans le <defs> du SVG qui dessine le corps). */
export interface BodyIds {
  /** Ombre sur le côté droit, reflet sur le gauche. */
  shade: string;
  /** Ombre sous les épaules. */
  shadeV: string;
}

export const DEFAULT_BODY_IDS: BodyIds = { shade: 'body-shade', shadeV: 'body-shade-v' };

export interface BodyLook {
  skin: string;
  /** Couleur du haut (déjà résolue). */
  top: string;
  /** Couleur du bas (déjà résolue), sinon jean ou, pour une jupe, la couleur du haut. */
  pants?: string;
  garment: Garment;
}

/**
 * Corps entier : jambes et chaussures, bras (moufles), buste aux épaules rondes, habit de base (haut de la couleur de la
 * tenue, pantalon ou jupe). `back` se dessine avant la tête, `front` après (encolure, ombre du menton).
 */
export function bodyShapes(look: BodyLook, ids: BodyIds = DEFAULT_BODY_IDS): { back: Shape[]; front: Shape[] } {
  const cx = 100;
  const { skin, top, garment } = look;
  const bottom = garment.bottom ?? 'pants';
  const pants = look.pants ?? (bottom === 'skirt' ? top : '#4f63a8');
  const accent = darken(top, 0.05);
  // contour de la peau (bras, mains, jambes) : même brun chaud que celui du visage, même épaisseur partout
  const outline = darken(skin, 0.4);
  const { shoulderY: sy, waistY, hipY, kneeY, ankleY, footY, shoulderW, waistW, hipW, armLen, armW } = M;
  const shade = (d: string, opacity = 1): Shape => path(d, `url(#${ids.shade})`, { opacity });
  const back: Shape[] = [ellipse(cx, footY + 2, 58, 9, '#2b1a3a', { opacity: 0.22 })];
  if (garment.hideBody) {
    return { back, front: [] };
  }

  // jambes un peu effilées ; chaussures à semelle claire et bout de couleur
  const leg = (side: -1 | 1): Shape[] => {
    const outer = cx + side * hipW;
    const inner = cx + side * 2.5;
    const ankleO = cx + side * 21;
    const ankleI = cx + side * 5;
    // pose de repos : le poids sur la jambe gauche, la droite un peu relâchée vers l'extérieur
    const relax = side === 1 ? 3 : 0;
    const d = `M ${outer} ${hipY - 4} L ${inner} ${hipY - 4} Q ${inner - side + relax} ${kneeY} ${ankleI + relax} ${ankleY} L ${ankleO + relax} ${ankleY} Q ${outer - side + relax} ${kneeY} ${outer} ${hipY - 4} Z`;
    const shoeX = cx + side * 14 + relax;
    const toe = cx + side * 21 + relax;
    return [
      bottom === 'pants' ? path(d, pants) : path(d, skin, { stroke: outline, sw: OUTLINE_W }),
      ...(bottom === 'pants' ? [shade(d)] : []),
      ...(bottom === 'shorts'
        ? [
            path(`M ${outer} ${hipY - 4} L ${inner} ${hipY - 4} L ${inner} ${kneeY - 14} L ${outer - side * 1.5} ${kneeY - 14} Z`, pants),
            path(`M ${outer} ${hipY - 4} L ${inner} ${hipY - 4} L ${inner} ${kneeY - 14} L ${outer - side * 1.5} ${kneeY - 14} Z`, `url(#${ids.shade})`),
            path(`M ${inner} ${kneeY - 14} L ${outer - side * 1.5} ${kneeY - 14}`, 'none', { stroke: darken(pants, 0.2), sw: 2.5 }),
          ]
        : []),
      ellipse(shoeX + side * 3, footY - 8, 17, 10, '#fafafa'),
      path(`M ${shoeX - 14} ${footY - 3} Q ${shoeX + side * 3} ${footY + 5} ${shoeX + 20} ${footY - 3} L ${shoeX + 20} ${footY - 1} Q ${shoeX + side * 3} ${footY + 7} ${shoeX - 14} ${footY - 1} Z`, '#cfd8dc'),
      ellipse(toe, footY - 9, 8, 6.5, accent),
      ellipse(shoeX + side * 3, footY - 8, 17, 10, `url(#${ids.shade})`, { opacity: 0.6 }),
    ];
  };
  back.push(...leg(-1), ...leg(1));

  // bras écartés de quelques degrés, coude un peu plié (le droit un peu plus : pose de repos), main en moufle avec un pouce.
  // Le bras part de l'intérieur de la manche : épaule arrondie de la couleur du haut, manche plus large que le bras.
  const arm = (side: -1 | 1): Shape[] => {
    const bend = side === 1 ? 2 : 0;
    const sx = cx + side * (shoulderW - 6);
    const ay = sy + 11;
    const ex = cx + side * (shoulderW + 15 + bend);
    const ey = ay + armLen * 0.5;
    const wx = cx + side * (shoulderW + 12);
    const wy = ay + armLen;
    const stroke = (d: string, col: string, w: number): Shape => path(d, 'none', { stroke: col, sw: w });
    // le bras est un trait épais à bouts ronds (épaule → coude → poignet), tracé deux fois : le contour, puis la peau en
    // couleur unie par-dessus (exactement celle du visage). Il commence sous la manche, près de l'épaule.
    const arm1 = `M ${sx} ${ay} C ${sx + side * 6} ${ay + 8} ${ex} ${ey - 12} ${ex} ${ey} C ${ex + side} ${ey + 8} ${wx + side * 3} ${wy - 10} ${wx} ${wy}`;
    const skinW = armW - 2;
    const hx = wx;
    const hy = wy + 7;
    const thumb = `M ${wx - side * 4} ${wy + 3} Q ${wx - side * 12} ${wy + 5} ${wx - side * 9} ${wy + 13} Q ${wx - side * 6} ${wy + 14} ${wx - side * 4} ${wy + 10} Z`;
    const out: Shape[] = [
      stroke(arm1, outline, skinW + OUTLINE_W * 2),
      // main : moufle (rond aplati + pouce suggéré), même contour, raccordée au bout du trait
      ellipse(hx, hy, armW * 0.68, armW * 0.88, outline, { stroke: outline, sw: OUTLINE_W * 2 }),
      path(thumb, outline, { stroke: outline, sw: OUTLINE_W * 2 }),
      stroke(arm1, skin, skinW),
      ellipse(hx, hy, armW * 0.68, armW * 0.88, skin),
      path(thumb, skin),
    ];
    if (garment.sleeve !== 'none') {
      const long = garment.sleeve === 'long';
      const sw = armW + 4;
      const tipX = long ? wx : sx + (ex - sx) * 0.9;
      const tipY = long ? wy - 5 : ay + (ey - ay) * 0.8;
      const d = long ? `M ${sx} ${ay} C ${sx + side * 6} ${ay + 8} ${ex} ${ey - 12} ${ex} ${ey} C ${ex + side} ${ey + 8} ${wx + side * 3} ${wy - 12} ${tipX} ${tipY}` : `M ${sx} ${ay} C ${sx + side * 6} ${ay + 8} ${ex} ${ey - 14} ${tipX} ${tipY}`;
      out.push(circle(sx, ay, sw / 2, top), stroke(d, top, sw), stroke(d, `url(#${ids.shade})`, sw));
    }
    return out;
  };

  // buste : épaules rondes, taille, hanches
  const body = `M ${cx - 11} ${sy - 3} Q ${cx - shoulderW + 2} ${sy - 4} ${cx - shoulderW} ${sy + 12} L ${cx - waistW} ${waistY} Q ${cx - hipW - 2} ${hipY - 8} ${cx - hipW} ${hipY + 2} L ${cx + hipW} ${hipY + 2} Q ${cx + hipW + 2} ${hipY - 8} ${cx + waistW} ${waistY} L ${cx + shoulderW} ${sy + 12} Q ${cx + shoulderW - 2} ${sy - 4} ${cx + 11} ${sy - 3} Z`;
  back.push(...arm(-1), ...arm(1));
  back.push(path(body, top), shade(body), path(body, `url(#${ids.shadeV})`));
  if (bottom === 'skirt') {
    const skirt = `M ${cx - waistW} ${waistY - 2} L ${cx + waistW} ${waistY - 2} L ${cx + hipW + 16} ${kneeY - 6} Q ${cx} ${kneeY + 4} ${cx - hipW - 16} ${kneeY - 6} Z`;
    back.push(path(skirt, top), shade(skirt), path(`M ${cx - hipW - 14} ${kneeY - 8} Q ${cx} ${kneeY + 2} ${cx + hipW + 14} ${kneeY - 8}`, 'none', { stroke: lighten(top, 0.3), sw: 2 }));
  } else {
    back.push(rect(cx - hipW - 1, hipY - 6, hipW * 2 + 2, 6, 3, darken(top, 0.18)));
  }

  // devant : encolure ronde qui cache le bas du cou
  const front: Shape[] = [
    path(`M ${cx - 17} ${sy - 4} Q ${cx} ${sy + 15} ${cx + 17} ${sy - 4} L ${cx + 22} ${sy + 8} L ${cx - 22} ${sy + 8} Z`, top),
    path(`M ${cx - 17} ${sy - 4} Q ${cx} ${sy + 15} ${cx + 17} ${sy - 4}`, 'none', { stroke: darken(top, 0.2), sw: 2.2 }),
  ];
  return { back, front };
}
