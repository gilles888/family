import { Shape, circle, ellipse, line, path, rect, star } from '../shared/svg/shapes';
import { SeasonId } from './seasons';

/**
 * Pictogrammes des thèmes, construits avec la bibliothèque SVG (viewBox 0 0 200 200, couleurs en dur : ce sont des
 * illustrations, indépendantes de la palette).
 */

const point = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [
    Math.round((cx + r * Math.cos(a)) * 10) / 10,
    Math.round((cy + r * Math.sin(a)) * 10) / 10,
  ];
};

const branche = (deg: number, color: string): Shape[] => {
  const [x1, y1] = point(100, 100, 82, deg);
  const [x2, y2] = point(100, 100, 82, deg + 180);
  const [a1, b1] = point(100, 100, 56, deg);
  const [a2, b2] = point(100, 100, 56, deg + 180);
  const arm = (cx: number, cy: number, deg2: number) => {
    const [p1x, p1y] = point(cx, cy, 20, deg2 + 150);
    const [p2x, p2y] = point(cx, cy, 20, deg2 - 150);
    return line(`M${p1x} ${p1y} L${cx} ${cy} L${p2x} ${p2y}`, color, 7);
  };
  return [line(`M${x1} ${y1} L${x2} ${y2}`, color, 9), arm(a1, b1, deg), arm(a2, b2, deg + 180)];
};

const rayons = (): Shape[] =>
  Array.from({ length: 8 }, (_, i) => {
    const [x1, y1] = point(100, 100, 56, i * 45);
    const [x2, y2] = point(100, 100, 82, i * 45);
    return line(`M${x1} ${y1} L${x2} ${y2}`, '#ffa000', 11);
  });

const petales = (): Shape[] =>
  Array.from({ length: 5 }, (_, i) => {
    const [x, y] = point(100, 82, 34, i * 72 - 90);
    return circle(x, y, 26, '#f06292');
  });

export const SEASON_PICTOS: Record<SeasonId, Shape[]> = {
  // citrouille
  halloween: [
    path('M92 52 Q96 28 116 24 L118 34 Q104 38 104 54Z', '#558b2f'),
    ellipse(58, 120, 40, 56, '#fb8c00'),
    ellipse(142, 120, 40, 56, '#fb8c00'),
    ellipse(100, 120, 48, 60, '#ffa726'),
    path('M68 100 L90 100 L79 80Z', '#3e2723'),
    path('M110 100 L132 100 L121 80Z', '#3e2723'),
    path('M66 138 Q100 176 134 138 L122 134 L112 146 L100 136 L88 146 L78 134Z', '#3e2723'),
  ],
  // mitre de saint Nicolas
  'saint-nicolas': [
    path('M50 168 L56 100 Q100 -4 144 100 L150 168Z', '#d32f2f'),
    path('M100 28 Q100 100 100 168 L56 168 L62 98 Q80 50 100 28Z', '#e53935'),
    rect(52, 132, 96, 18, 4, '#ffd54f'),
    rect(94, 56, 12, 50, 3, '#ffd54f'),
    rect(78, 72, 44, 12, 3, '#ffd54f'),
    circle(100, 141, 6, '#d32f2f'),
  ],
  // sapin
  noel: [
    rect(90, 150, 20, 32, 3, '#6d4c41'),
    path('M100 66 L152 112 L48 112Z', '#2e7d32'),
    path('M100 40 L148 86 L52 86Z', '#388e3c'),
    path('M100 96 L164 154 L36 154Z', '#2e7d32'),
    star(100, 34, 18, 8, '#ffca28'),
    circle(80, 128, 7, '#e53935'),
    circle(124, 140, 7, '#ffca28'),
    circle(108, 112, 6, '#e53935'),
    circle(76, 96, 5, '#ffca28'),
  ],
  // masque
  carnaval: [
    path(
      'M18 88 Q100 30 182 88 Q178 150 134 142 Q116 132 100 124 Q84 132 66 142 Q22 150 18 88Z',
      '#8e24aa',
    ),
    path('M18 88 Q100 30 182 88', 'none', { stroke: '#ffd54f', sw: 6 }),
    ellipse(64, 104, 22, 15, '#fffde7'),
    ellipse(136, 104, 22, 15, '#fffde7'),
    star(100, 80, 11, 5, '#ffd54f'),
    path('M168 62 Q200 20 188 -4', 'none', { stroke: '#26c6da', sw: 7 }),
  ],
  // œuf décoré
  paques: [
    path('M100 24 C150 24 164 108 156 140 C148 178 52 178 44 140 C36 108 50 24 100 24Z', '#f48fb1'),
    path('M46 112 L68 94 L90 112 L112 94 L134 112 L156 96', 'none', { stroke: '#fff176', sw: 10 }),
    circle(70, 146, 9, '#fff176'),
    circle(100, 150, 9, '#80deea'),
    circle(130, 146, 9, '#fff176'),
    circle(100, 62, 9, '#80deea'),
  ],
  // soleil
  ete: [
    ...rayons(),
    circle(100, 100, 42, '#ffb300'),
    circle(100, 100, 42, 'none', { stroke: '#ff8f00', sw: 5 }),
  ],
  // cartable
  rentree: [
    path('M72 70 Q100 18 128 70', 'none', { stroke: '#0d47a1', sw: 10 }),
    rect(42, 62, 116, 112, 18, '#1e88e5'),
    rect(42, 62, 116, 54, 18, '#1565c0'),
    rect(86, 96, 28, 26, 5, '#ffd54f'),
    rect(58, 134, 84, 28, 8, '#64b5f6'),
  ],
  // fleur
  printemps: [
    line('M100 108 L100 184', '#43a047', 9),
    ellipse(128, 150, 24, 10, '#66bb6a'),
    ...petales(),
    circle(100, 82, 20, '#ffd54f'),
  ],
  // feuille
  automne: [
    path('M100 18 C176 58 172 142 100 184 C28 142 24 58 100 18Z', '#ef6c00'),
    line('M100 30 L100 196', '#8d3a0c', 7),
    line('M100 92 L142 66 M100 120 L148 98 M100 92 L58 66 M100 120 L52 98', '#8d3a0c', 5),
  ],
  // flocon
  hiver: [
    ...branche(-90, '#29b6f6'),
    ...branche(-30, '#29b6f6'),
    ...branche(30, '#29b6f6'),
    circle(100, 100, 10, '#e1f5fe'),
  ],
  // gâteau
  anniversaire: [
    rect(76, 40, 9, 30, 3, '#4fc3f7'),
    rect(115, 40, 9, 30, 3, '#f06292'),
    ellipse(80.5, 32, 7, 11, '#ffb300'),
    ellipse(119.5, 32, 7, 11, '#ffb300'),
    rect(46, 70, 108, 44, 10, '#f48fb1'),
    path(
      'M46 92 Q60 108 74 92 Q88 108 102 92 Q116 108 130 92 Q144 108 154 92 L154 80 L46 80Z',
      '#fff8e1',
    ),
    rect(34, 112, 132, 52, 10, '#ce93d8'),
    rect(22, 164, 156, 12, 6, '#bdbdbd'),
    circle(60, 138, 5, '#fff8e1'),
    circle(100, 138, 5, '#fff8e1'),
    circle(140, 138, 5, '#fff8e1'),
  ],
};
