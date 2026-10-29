import { Shape, darken, lighten, rect } from '../shared/svg/shapes';
import { SeasonId } from '../theme/seasons';
import {
  BOOKS, CHEST_FRONT, CURTAIN_LEFT, CURTAIN_RIGHT, CURTAIN_ROD, DIE_FRONT, HAT_BEANIE, HAT_CAP, HAT_CROWN, MIRROR, PIG_SPRITE,
  SHOP_DOOR, SIGN, WINDOW_FRAME, WOOD, WOOD_DARK, WOOD_LIGHT, WindowSeason, drawers, wardrobeDoor, wardrobeInside, windowView,
} from './room-props';
import { Box, Layer, P2, Projection, V3, box, decal, floorEllipse, perspective, polyline, quad, shadowOf, sprite } from './room-3d';

/** Un point cliquable de la pièce : un meuble, ou un objet (dé, livre). */
export type FurnitureId = 'armoire' | 'commode' | 'chapeaux' | 'coiffeuse' | 'coffre' | 'fenetre' | 'tirelire' | 'boutique';
export type RoomSpot = FurnitureId | 'de' | 'livre';

/** Dimensions de la pièce dessinée (unités de l'écran). */
export const ROOM_W = 1000;
export const ROOM_H = 414;
export const ROOM_VIEWBOX = `0 0 ${ROOM_W} ${ROOM_H}`;

/** Rectangle [x, y, largeur, hauteur] dans le viewBox de la pièce. */
export type Rect = readonly [number, number, number, number];

export interface RoomOptions {
  /** Ciel de la fenêtre : couleur ou `url(#room-sky)` (le fond choisi dans la garde-robe). */
  sky: string;
  night: boolean;
  season: WindowSeason;
}

export interface RoomModel {
  layers: Layer[];
  /** Rectangle cliquable de chaque meuble / objet. */
  spots: Record<RoomSpot, Rect>;
  /** Le personnage entier : position (haut-gauche) et largeur de son cadre, et l'échelle par unité du corps. */
  character: { left: number; top: number; width: number; scale: number };
}

/** Saison de la vue par la fenêtre selon le thème en cours. */
export function windowSeason(theme: SeasonId | 'neutre'): WindowSeason {
  switch (theme) {
    case 'noel':
    case 'saint-nicolas':
    case 'hiver':
      return 'hiver';
    case 'automne':
    case 'halloween':
      return 'automne';
    case 'printemps':
    case 'paques':
      return 'printemps';
    default:
      return 'ete';
  }
}

interface Dims {
  W: number;
  Dp: number;
  H: number;
}

/** Repère d'un mur : l'origine au pied du mur, `a` le long du mur, `n` vers l'intérieur de la pièce. */
interface Frame {
  o: V3;
  a: V3;
  n: V3;
}

const at = (f: Frame, a: number, n: number, y: number): V3 => [f.o[0] + f.a[0] * a + f.n[0] * n, y, f.o[2] + f.a[2] * a + f.n[2] * n];

/** Volume rangé contre un mur : a0..a1 le long du mur, n0..n1 en profondeur, y0..y1 en hauteur. */
function lbox(f: Frame, a0: number, a1: number, n0: number, n1: number, y0: number, y1: number): Box {
  const p = [at(f, a0, n0, y0), at(f, a1, n1, y1)];
  return { x0: Math.min(p[0][0], p[1][0]), x1: Math.max(p[0][0], p[1][0]), y0, y1, z0: Math.min(p[0][2], p[1][2]), z1: Math.max(p[0][2], p[1][2]) };
}

/** Décor posé sur la face avant d'un meuble ou d'un mur du repère f. */
function onWall(pr: Projection, f: Frame, a0: number, n: number, yTop: number, w: number, h: number, shapes: Shape[], name?: string): Layer {
  return decal(pr, at(f, a0, n, yTop), [f.a[0] * w, 0, f.a[2] * w], [0, -h, 0], w, h, shapes, name);
}

/** Rectangle écran qui englobe des volumes (zone cliquable). */
function bounds(pr: Projection, boxes: Box[], pad = 4): Rect {
  const pts: P2[] = boxes.flatMap((b) => [b.x0, b.x1].flatMap((x) => [b.y0, b.y1].flatMap((y) => [b.z0, b.z1].map((z) => pr.p([x, y, z])))));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs) - pad);
  const y0 = Math.max(0, Math.min(...ys) - pad);
  const x1 = Math.min(ROOM_W, Math.max(...xs) + pad);
  const y1 = Math.min(ROOM_H, Math.max(...ys) + pad);
  return [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)];
}

const sorted = <T extends { key: number }>(items: T[]) => items.sort((x, y) => x.key - y.key);
const round = (n: number) => Math.round(n * 10) / 10;

/**
 * La chambre en 2,5D douce, vue de face : perspective à un point de fuite, murs, sol et meubles en volumes (dessus et côtés
 * visibles, relief, ombres portées floues), lumière de la fenêtre. Les pièces qui s'ouvrent (portes, tiroirs, couvercle,
 * rideaux…) sont des calques à part, marqués `cls` / `opens`, que la scène anime en CSS.
 */
export function buildRoom(opts: RoomOptions): RoomModel {
  const dims: Dims = { W: 760, Dp: 360, H: 280 };
  const pr = perspective({ vx: 500, vy: 270, k0: 1.28, camX: 380, camY: 70, camZ: 1000 });
  const { W, Dp, H } = dims;
  const L: Layer[] = [];
  const push = (...layers: Layer[]) => L.push(...layers);
  const spots = {} as Record<RoomSpot, Rect>;

  const back: Frame = { o: [0, 0, 0], a: [1, 0, 0], n: [0, 0, 1] };

  // ---------- murs, plafond, sol
  const wallBase = '#fde4d2';
  const floorBase = '#e9c9a0';
  const leftWall: V3[] = [[0, 0, Dp], [0, 0, 0], [0, H, 0], [0, H, Dp]];
  const rightWall: V3[] = [[W, 0, 0], [W, 0, Dp], [W, H, Dp], [W, H, 0]];
  const backWall: V3[] = [[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]];
  push({
    name: 'murs',
    shapes: [
      quad(pr, leftWall, darken(wallBase, 0.07)),
      quad(pr, leftWall, 'url(#room-wall)'),
      quad(pr, rightWall, darken(wallBase, 0.12)),
      quad(pr, rightWall, 'url(#room-wall)'),
      quad(pr, backWall, wallBase),
      quad(pr, backWall, 'url(#room-wall)'),
      quad(pr, [[0, H, 0], [W, H, 0], [W, H, Dp], [0, H, Dp]], lighten(wallBase, 0.35)),
    ],
  });
  // papier peint rayé, lambris et plinthes
  const stripes: Shape[] = [];
  for (let x = 12; x < W - 10; x += 44) stripes.push(quad(pr, [[x, 70, 0], [x + 14, 70, 0], [x + 14, H, 0], [x, H, 0]], darken(wallBase, 0.035)));
  push({ name: 'papier-peint', shapes: stripes });
  const wainscot = (corners: (h: number) => V3[], color: string): Shape[] => [
    quad(pr, corners(70), color),
    quad(pr, corners(70), 'url(#room-v)'),
    polyline([pr.p(corners(70)[3]), pr.p(corners(70)[2])], lighten(color, 0.5), 2.2),
    quad(pr, corners(9), lighten(color, 0.5)),
  ];
  push({
    name: 'lambris',
    shapes: [...wainscot((h) => [[0, 0, 0], [W, 0, 0], [W, h, 0], [0, h, 0]], '#f2c9ab'), ...wainscot((h) => [[0, 0, Dp], [0, 0, 0], [0, h, 0], [0, h, Dp]], '#e7bb9a')],
  });
  // sol : lames qui convergent, joints décalés
  const floor: Shape[] = [quad(pr, [[0, 0, 0], [W, 0, 0], [W, 0, Dp], [0, 0, Dp]], floorBase), quad(pr, [[0, 0, 0], [W, 0, 0], [W, 0, Dp], [0, 0, Dp]], 'url(#room-top)')];
  for (let x = 64, i = 1; x < W; x += 64, i++) {
    floor.push(polyline([pr.p([x, 0, 0]), pr.p([x, 0, Dp])], '#c9a06e', 1.2, { opacity: 0.7 }));
    for (let z = (i % 2) * 90; z < Dp; z += 180) floor.push(polyline([pr.p([x - 64, 0, z]), pr.p([x, 0, z])], '#c9a06e', 1, { opacity: 0.6 }));
  }
  push({ name: 'sol', shapes: floor });
  // ombres de coin : mur / sol et mur / mur (floues)
  push({
    name: 'ombres-coin',
    filter: 'room-blur',
    shapes: [
      polyline([pr.p([0, 0, 0]), pr.p([W, 0, 0])], '#3b1d0a', 16, { opacity: 0.32 }),
      polyline([pr.p([0, 0, 0]), pr.p([0, 0, Dp])], '#3b1d0a', 16, { opacity: 0.3 }),
      polyline([pr.p([0, 0, 0]), pr.p([0, H, 0])], '#3b1d0a', 14, { opacity: 0.22 }),
      polyline([pr.p([W, 0, 0]), pr.p([W, H, 0])], '#3b1d0a', 14, { opacity: 0.2 }),
    ],
  });

  // ---------- fenêtre : vue, cadre, rideaux (deux pans qui s'écartent), rebord, lumière
  const winA = 160;
  const winY = 105;
  const winW = 120;
  const winH = 100;
  const winTop = winY + winH;
  push({ ...onWall(pr, back, winA, 0, winTop, winW, winH, windowView(opts), 'vue-fenetre'), clip: 'room-window-clip' });
  push(onWall(pr, back, winA, 0, winTop, winW, winH, WINDOW_FRAME, 'cadre-fenetre'));
  push({ ...onWall(pr, back, winA, 0, winTop + 6, winW, winH, CURTAIN_LEFT, 'rideau-gauche'), cls: 'curtain left', opens: 'fenetre' });
  push({ ...onWall(pr, back, winA, 0, winTop + 6, winW, winH, CURTAIN_RIGHT, 'rideau-droit'), cls: 'curtain right', opens: 'fenetre' });
  push(onWall(pr, back, winA, 0, winTop + 6, winW, winH, CURTAIN_ROD, 'tringle'));
  push({ name: 'rebord', shapes: box(pr, lbox(back, winA - 6, winA + winW + 6, 0, 11, winY - 5, winY), '#fffaf3') });
  spots.fenetre = bounds(pr, [lbox(back, winA - 14, winA + winW + 14, 0, 11, winY - 5, winTop + 12)]);
  // halo sur le mur et rayon de soleil au sol (très léger la nuit)
  push({
    name: 'halo',
    filter: 'room-blur-soft',
    shapes: [
      quad(pr, [[winA - 30, winY - 20, 0], [winA + winW + 30, winY - 20, 0], [winA + winW + 30, winY + winH + 30, 0], [winA - 30, winY + winH + 30, 0]], '#fff7d6', { opacity: opts.night ? 0.12 : 0.5 }),
      quad(pr, [[winA, 0, 2], [winA + winW, 0, 2], [winA + winW + 120, 0, 300], [winA + 110, 0, 300]], '#fffbe0', { opacity: opts.night ? 0.1 : 0.42 }),
    ],
  });

  // ---------- meubles (dessinés du fond vers l'avant)
  const items: { key: number; layers: Layer[] }[] = [];
  const add = (key: number, ...layers: Layer[]) => items.push({ key, layers });
  const shadowLayer = (b: Box): Layer => ({ name: 'ombre', filter: 'room-blur', shapes: [shadowOf(pr, b)] });

  /** Armoire : l'intérieur (vêtements suspendus) est toujours dessiné, les deux battants le cachent et s'ouvrent par-dessus. */
  const armoire = (a0: number, key: number) => {
    const w = 120;
    const d = 52;
    const h = 244;
    const body = lbox(back, a0, a0 + w, 0, d, 0, h);
    const innerW = w - 12;
    const innerH = h - 18;
    const doorW = (w - 8) / 2;
    const doorH = h - 14;
    add(
      key,
      shadowLayer(body),
      { name: 'armoire', shapes: [...box(pr, body, WOOD), ...box(pr, lbox(back, a0 - 4, a0 + w + 4, 0, d + 4, h, h + 10), WOOD_DARK), ...box(pr, lbox(back, a0 + 4, a0 + w - 4, 0, d, 0, 8), WOOD_DARK)] },
      onWall(pr, back, a0 + 6, d, h - 8, innerW, innerH, wardrobeInside(innerW, innerH), 'interieur'),
      { ...onWall(pr, back, a0 + 4, d, h - 7, doorW, doorH, wardrobeDoor(doorW, doorH, 'left'), 'porte-gauche'), cls: 'door door-left', opens: 'armoire' },
      { ...onWall(pr, back, a0 + 4 + doorW, d, h - 7, doorW, doorH, wardrobeDoor(doorW, doorH, 'right'), 'porte-droite'), cls: 'door door-right', opens: 'armoire' },
    );
    spots.armoire = bounds(pr, [lbox(back, a0 - 4, a0 + w + 4, 0, d + 4, 0, h + 10)]);
  };

  /** Commode à trois tiroirs (celui du milieu sort), avec le dé de « Surprise ! » dessus. */
  const commode = (a0: number, key: number) => {
    const w = 112;
    const d = 46;
    const h = 100;
    const body = lbox(back, a0, a0 + w, 0, d, 0, h);
    // chaque tiroir est un calque à part : les 3 formes (face, relief, poignée) de sa tranche de la façade
    const drawerLayers: Layer[] = [0, 1, 2].map((i) => onWall(pr, back, a0, d, h - 2, w, h - 4, drawers(w, h - 4).slice(i * 3, i * 3 + 3), `tiroir-${i}`));
    drawerLayers[1] = { ...drawerLayers[1], cls: 'drawer', opens: 'commode' };
    add(
      key,
      shadowLayer(body),
      { name: 'commode', shapes: [...box(pr, body, WOOD), ...box(pr, lbox(back, a0 - 4, a0 + w + 4, 0, d + 5, h, h + 5), WOOD_DARK)] },
      // ombre du tiroir sorti : grandit quand il s'ouvre
      { name: 'ombre-tiroir', filter: 'room-blur', cls: 'drawer-shadow', opens: 'commode', shapes: [floorEllipse(pr, a0 + w / 2, d + 26, 46, 14, '#3b1d0a', { opacity: 0.34 })] },
      ...drawerLayers,
      { name: 'de', cls: 'dice', shapes: box(pr, lbox(back, a0 + 66, a0 + 82, 12, 28, h + 5, h + 21), '#ffffff') },
      onWall(pr, back, a0 + 66, 28, h + 21, 16, 16, DIE_FRONT, 'de-points'),
    );
    spots.commode = bounds(pr, [lbox(back, a0 - 4, a0 + w + 4, 0, d + 5, 0, h + 5)]);
    spots.de = bounds(pr, [lbox(back, a0 + 66, a0 + 82, 12, 28, h + 5, h + 21)], 6);
  };

  /** Étagère murale, objets posés dessus (sprites ancrés sur la planche). */
  const shelf = (a0: number, w: number, y: number, key: number, things: { a: number; shapes: Shape[]; s?: number; cls?: string; opens?: string }[]) => {
    const board = lbox(back, a0, a0 + w, 0, 24, y, y + 5);
    add(
      key,
      { name: 'etagere', shapes: [...box(pr, board, WOOD_DARK), ...box(pr, lbox(back, a0 + 8, a0 + 16, 0, 20, y - 14, y), '#8d6e63'), ...box(pr, lbox(back, a0 + w - 16, a0 + w - 8, 0, 20, y - 14, y), '#8d6e63')] },
      ...things.map((t, i) => {
        const l = sprite(pr, at(back, a0 + t.a, 12, y + 5), t.shapes, `objet-${i}`);
        return { ...l, transform: l.transform + (t.s ? ` scale(${t.s})` : ''), cls: t.cls, opens: t.opens };
      }),
    );
    return board;
  };

  /** Coiffeuse : plateau, pieds, tiroir, tabouret, miroir au mur. */
  const vanity = (a0: number, key: number) => {
    const w = 112;
    const d = 40;
    const legs = [0, 1].flatMap((i) => [0, 1].map((j) => lbox(back, a0 + 4 + i * (w - 12), a0 + 8 + i * (w - 12), 4 + j * (d - 12), 8 + j * (d - 12), 0, 60)));
    add(
      key,
      shadowLayer(lbox(back, a0, a0 + w, 0, d, 0, 62)),
      onWall(pr, back, a0 + 26, 0, 168, 60, 90, MIRROR, 'miroir'),
      { name: 'coiffeuse', shapes: [...legs.flatMap((b) => box(pr, b, WOOD_DARK)), ...box(pr, lbox(back, a0, a0 + w, 0, d, 60, 66), WOOD), ...box(pr, lbox(back, a0 + 20, a0 + w - 20, 2, d - 2, 40, 60), WOOD_LIGHT)] },
      sprite(pr, at(back, a0 + 20, 20, 66), [rect(0, -22, 9, 22, 3, '#f48fb1'), rect(14, -16, 8, 16, 3, '#81d4fa'), rect(86, -9, 12, 9, 4, '#fff59d')], 'flacons'),
      { name: 'tabouret', shapes: [...box(pr, lbox(back, a0 + 36, a0 + 76, 56, 94, 0, 30), '#f48fb1'), ...box(pr, lbox(back, a0 + 38, a0 + 74, 58, 92, 28, 36), '#f8bbd0')] },
    );
    spots.coiffeuse = bounds(pr, [lbox(back, a0 + 26, a0 + 86, 0, 4, 78, 168), lbox(back, a0, a0 + w, 0, d, 0, 66), lbox(back, a0 + 36, a0 + 76, 56, 94, 0, 36)]);
  };

  /** Coffre à jouets : corps, intérieur sombre, couvercle qui se relève. */
  const chest = (a0: number, nOff: number, key: number) => {
    const w = 96;
    const d = 46;
    const body = lbox(back, a0, a0 + w, nOff, nOff + d, 0, 34);
    const lid = lbox(back, a0 - 2, a0 + w + 2, nOff - 2, nOff + d + 2, 34, 46);
    const inside = [at(back, a0 + 6, nOff + 6, 34), at(back, a0 + w - 6, nOff + 6, 34), at(back, a0 + w - 6, nOff + d - 6, 34), at(back, a0 + 6, nOff + d - 6, 34)];
    add(
      key,
      shadowLayer(body),
      { name: 'coffre', shapes: [...box(pr, body, '#e9837f')] },
      { name: 'coffre-interieur', cls: 'chest-inside', opens: 'coffre', shapes: [quad(pr, inside, '#5b2b2b'), quad(pr, inside, '#2a1010', { opacity: 0.5 })] },
      onWall(pr, back, a0, nOff + d, 34, w, 34, CHEST_FRONT, 'bandes'),
      { name: 'couvercle', cls: 'lid', opens: 'coffre', shapes: box(pr, lid, '#d9686a') },
    );
    spots.coffre = bounds(pr, [lbox(back, a0 - 2, a0 + w + 2, nOff - 2, nOff + d + 2, 0, 46)]);
  };

  /** Porte de la boutique : bois, auvent rayé, enseigne ; elle s'entrouvre sur une bande de lumière. */
  const shopDoor = (a0: number, key: number) => {
    const w = 66;
    const h = 190;
    const awning: Shape[] = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x0 = a0 - 8 + (i * (w + 16)) / n;
      const x1 = a0 - 8 + ((i + 1) * (w + 16)) / n;
      const c = i % 2 === 0 ? '#e53935' : '#fff4e6';
      awning.push(quad(pr, [at(back, x0, 0, h + 14), at(back, x1, 0, h + 14), at(back, x1, 34, h - 6), at(back, x0, 34, h - 6)], c));
      awning.push(quad(pr, [at(back, x0, 34, h - 6), at(back, x1, 34, h - 6), at(back, x1, 34, h - 20), at(back, x0, 34, h - 20)], darken(c, 0.14)));
    }
    add(
      key,
      // derrière le battant : la lumière de la boutique
      onWall(pr, back, a0 + 4, 0, h - 5, w - 8, h - 5, [rect(0, 0, w - 8, h - 5, 2, '#fff7c2'), rect(0, 0, w - 8, h - 5, 2, '#ffd54f', { opacity: 0.35 })], 'lumiere-boutique'),
      { ...onWall(pr, back, a0, 0, h, w, h, SHOP_DOOR, 'porte'), cls: 'shop-door', opens: 'boutique' },
      onWall(pr, back, a0, 0, h + 40, w, 22, SIGN, 'enseigne'),
      { name: 'auvent', shapes: awning },
    );
    spots.boutique = bounds(pr, [lbox(back, a0 - 8, a0 + w + 8, 0, 34, 0, h + 62)]);
  };

  // ---------- dispositions : le personnage se tient au milieu, entre la fenêtre et la commode ; les panneaux (200 px de
  // chaque côté) laissent voir le meuble qui s'ouvre
  const figAnchor: V3 = [345, 0, 215];
  armoire(14, 1);
  commode(400, 3);
  const hatShelf = shelf(400, 112, 168, 2, [
    { a: 20, shapes: HAT_CAP, cls: 'rack', opens: 'chapeaux' },
    { a: 54, shapes: HAT_BEANIE, cls: 'rack', opens: 'chapeaux' },
    { a: 88, shapes: HAT_CROWN, cls: 'rack', opens: 'chapeaux' },
  ]);
  spots.chapeaux = bounds(pr, [lbox(back, 400, 512, 0, 24, 168, 198), hatShelf], 6);
  vanity(540, 4);
  shelf(534, 124, 188, 2.5, [
    { a: 18, shapes: BOOKS, s: 1.1 },
    { a: 74, shapes: PIG_SPRITE, s: 1.1, cls: 'pig', opens: 'tirelire' },
  ]);
  spots.tirelire = bounds(pr, [lbox(back, 534 + 56, 534 + 116, 0, 24, 188, 226)], 6);
  spots.livre = bounds(pr, [lbox(back, 534 + 16, 534 + 52, 0, 24, 188, 218)], 6);
  shopDoor(690, 3.5);
  chest(70, 110, 8);

  // tapis sous le personnage, puis meubles du fond vers l'avant
  push({
    name: 'tapis',
    shapes: [
      floorEllipse(pr, figAnchor[0], figAnchor[2], 140, 80, '#f6a8c4'),
      floorEllipse(pr, figAnchor[0], figAnchor[2], 118, 64, '#ef86ad', { opacity: 0.6 }),
      floorEllipse(pr, figAnchor[0], figAnchor[2], 98, 52, 'none', { stroke: '#ffffff', sw: 2.5, opacity: 0.85 }),
    ],
  });
  for (const it of sorted(items)) push(...it.layers);
  push({ name: 'ombre-personnage', filter: 'room-blur', shapes: [floorEllipse(pr, figAnchor[0], figAnchor[2], 26, 11, '#3b1d0a', { opacity: 0.4 })] });
  // éclairage général : léger vignettage
  push({ name: 'vignette', shapes: [rect(0, 0, ROOM_W, ROOM_H, 0, 'url(#room-vignette)')] });

  // le personnage entier (corps 290 unités ≈ 176 unités du monde) : pieds au point d'ancrage ; le cadre a 36 de marge au-dessus
  const [px, py] = pr.p(figAnchor);
  const sc = (pr.scaleAt(figAnchor) * 176) / 290;
  const character = { left: round(px - 100 * sc), top: round(py - 326 * sc), width: round(200 * sc), scale: round(sc * 1000) / 1000 };
  return { layers: L, spots, character };
}
