/*
 * Illustrations des étapes de routine : dessins originaux, style cartoon plat et arrondi (comme les avatars),
 * viewBox commun 0 0 100 100, couleurs fixes.
 *
 * Ajouter une icône : une entrée ci-dessous (id stable : il est enregistré dans les étapes des routines), libellé
 * traduit ($localize + messages.nl.xlf). `withCharacter` : l'avatar du membre s'affiche à côté de l'objet
 * (l'enfant se reconnaît dans les étapes où il est le héros : se lever, se brosser les dents…).
 */
import { INK, Shape, circle, ellipse, line, path, rect, star } from '../shared/svg/shapes';

export interface RoutineIcon {
  id: string;
  label: string;
  withCharacter?: boolean;
  shapes: Shape[];
}

const WATER = '#4fc3f7';

export const ROUTINE_ICONS: RoutineIcon[] = [
  {
    id: 'wake-up',
    label: $localize`:@@routineIcon.wakeUp:Réveil`,
    withCharacter: true,
    shapes: [
      circle(28, 26, 10, '#e53935'),
      circle(72, 26, 10, '#e53935'),
      line('M34 80 L28 90', '#c62828', 5),
      line('M66 80 L72 90', '#c62828', 5),
      circle(50, 56, 30, '#ef5350'),
      circle(50, 56, 23, '#ffffff'),
      line('M50 56 V40', INK, 4),
      line('M50 56 L61 62', INK, 4),
      circle(50, 56, 3, INK),
      rect(46, 20, 8, 8, 3, '#c62828'),
    ],
  },
  {
    id: 'toilet',
    label: $localize`:@@routineIcon.toilet:Toilettes`,
    shapes: [
      rect(28, 14, 44, 26, 7, '#e3e8ee'),
      circle(62, 24, 3.5, '#90a4ae'),
      path('M22 56 Q24 84 50 86 Q76 84 78 56 Z', '#eceff1'),
      ellipse(50, 56, 29, 10, '#cfd8dc'),
      ellipse(50, 56, 20, 6, '#b3e5fc'),
      rect(40, 84, 20, 8, 3, '#b0bec5'),
    ],
  },
  {
    id: 'toothbrush',
    label: $localize`:@@routineIcon.toothbrush:Brosse à dents`,
    withCharacter: true,
    shapes: [
      rect(8, 58, 56, 11, 5.5, '#42a5f5'),
      rect(60, 54, 32, 17, 6, '#1e88e5'),
      rect(63, 40, 26, 15, 4, '#ffffff'),
      line('M68 42 V52', '#e0e0e0', 2),
      line('M76 42 V52', '#e0e0e0', 2),
      line('M84 42 V52', '#e0e0e0', 2),
      path('M62 40 Q66 28 74 36 Q80 24 88 34 Q94 32 90 40 Z', '#80deea'),
      circle(24, 30, 6, '#b3e5fc'),
      circle(36, 18, 4, '#b3e5fc'),
    ],
  },
  {
    id: 'washbasin',
    label: $localize`:@@routineIcon.washbasin:Lavabo`,
    shapes: [
      path('M46 44 V28 Q46 20 56 20 H66 V28 H56 V44 Z', '#90a4ae'),
      path('M62 32 Q66 40 62 44 Q58 40 62 32 Z', WATER),
      rect(12, 42, 76, 9, 4.5, '#cfd8dc'),
      path('M16 50 H84 Q82 80 50 82 Q18 80 16 50 Z', '#eceff1'),
      ellipse(50, 56, 22, 5, '#b3e5fc'),
      rect(4, 60, 14, 26, 4, '#f48fb1'),
    ],
  },
  {
    id: 'clothes',
    label: $localize`:@@routineIcon.clothes:Vêtements`,
    shapes: [
      path('M28 24 L42 16 Q50 26 58 16 L72 24 L88 40 L74 50 V86 H26 V50 L12 40 Z', '#66bb6a'),
      path('M42 16 Q50 26 58 16', 'none', { stroke: '#388e3c', sw: 4 }),
      rect(40, 50, 20, 16, 4, '#43a047'),
    ],
  },
  {
    id: 'comb',
    label: $localize`:@@routineIcon.comb:Peigne`,
    withCharacter: true,
    shapes: [
      ...Array.from({ length: 11 }, (_, i) => rect(15 + i * 6.6, 46, 3.6, 26, 1.8, '#ab47bc')),
      rect(10, 34, 80, 16, 8, '#8e24aa'),
      rect(16, 38, 30, 4, 2, '#ce93d8'),
    ],
  },
  {
    id: 'breakfast',
    label: $localize`:@@routineIcon.breakfast:Petit-déjeuner`,
    shapes: [
      line('M70 14 L56 48', '#b0bec5', 5),
      ellipse(72, 12, 5, 7, '#b0bec5'),
      path('M12 48 H88 Q86 84 50 86 Q14 84 12 48 Z', '#ffb74d'),
      ellipse(50, 48, 38, 8, '#fff8e1'),
      ...[
        [30, 46],
        [42, 44],
        [54, 47],
        [66, 44],
        [74, 48],
        [38, 50],
        [60, 51],
      ].map(([x, y], i) => circle(x, y, 4, i % 2 ? '#ffcc80' : '#ffe082')),
      path('M22 66 Q50 74 78 66', 'none', { stroke: '#fb8c00', sw: 3 }),
    ],
  },
  {
    id: 'schoolbag',
    label: $localize`:@@routineIcon.schoolbag:Cartable`,
    shapes: [
      path('M36 30 Q36 14 50 14 Q64 14 64 30', 'none', { stroke: '#c62828', sw: 6 }),
      rect(18, 28, 64, 60, 14, '#ef5350'),
      path('M18 46 Q18 28 36 28 H64 Q82 28 82 46 V56 H18 Z', '#e53935'),
      rect(43, 50, 14, 12, 3, '#ffd54f'),
      rect(32, 66, 36, 16, 6, '#ff8a80'),
    ],
  },
  {
    id: 'water-bottle',
    label: $localize`:@@routineIcon.waterBottle:Gourde`,
    shapes: [
      rect(38, 10, 24, 16, 6, '#0277bd'),
      rect(32, 24, 36, 66, 14, '#29b6f6'),
      rect(32, 48, 36, 16, 0, '#b3e5fc'),
      rect(38, 30, 6, 52, 3, '#ffffff', { opacity: 0.4 }),
    ],
  },
  {
    id: 'shoes',
    label: $localize`:@@routineIcon.shoes:Chaussures`,
    shapes: [
      path('M8 64 Q8 44 24 42 L42 40 Q50 54 66 54 L84 56 Q94 58 94 68 V74 H8 Z', '#ff7043'),
      rect(6, 72, 90, 10, 5, '#eceff1'),
      line('M40 46 L48 42', '#ffffff', 3),
      line('M44 52 L54 47', '#ffffff', 3),
      rect(10, 50, 14, 10, 4, '#ffab91'),
    ],
  },
  {
    id: 'shower',
    label: $localize`:@@routineIcon.shower:Douche`,
    shapes: [
      path('M14 90 V14 H56 V24', 'none', { stroke: '#90a4ae', sw: 6 }),
      path('M40 24 H72 L66 36 H46 Z', '#b0bec5'),
      ...[
        [48, 46],
        [58, 44],
        [66, 48],
        [52, 60],
        [62, 58],
        [70, 62],
        [46, 74],
        [58, 72],
        [68, 78],
        [54, 86],
      ].map(([x, y]) => ellipse(x, y, 2.6, 4.5, WATER)),
    ],
  },
  {
    id: 'pyjamas',
    label: $localize`:@@routineIcon.pyjamas:Pyjama`,
    shapes: [
      path('M28 24 L42 16 Q50 26 58 16 L72 24 L88 40 L74 50 V86 H26 V50 L12 40 Z', '#7986cb'),
      ...[36, 52, 68].map((y) => line(`M28 ${y} H72`, '#c5cae9', 5)),
      circle(50, 40, 2.5, '#ffffff'),
      circle(50, 60, 2.5, '#ffffff'),
      star(76, 76, 7, 3, '#fff59d'),
    ],
  },
  {
    id: 'book',
    label: $localize`:@@routineIcon.book:Livre`,
    shapes: [
      path('M8 26 V84 Q30 78 50 88 Q70 78 92 84 V26 Q70 22 50 30 Q30 22 8 26 Z', '#ff7043'),
      path('M50 30 Q34 20 14 24 V78 Q34 74 50 82 Z', '#fff8e1'),
      path('M50 30 Q66 20 86 24 V78 Q66 74 50 82 Z', '#fffde7'),
      ...[38, 48, 58].map((y) => line(`M22 ${y} Q32 ${y - 3} 42 ${y + 1}`, '#ffcc80', 2.5)),
      ...[38, 48, 58].map((y) => line(`M58 ${y + 1} Q68 ${y - 3} 78 ${y}`, '#ffcc80', 2.5)),
    ],
  },
  {
    id: 'bed',
    label: $localize`:@@routineIcon.bed:Lit`,
    withCharacter: true,
    shapes: [
      rect(8, 30, 14, 58, 5, '#8d6e63'),
      rect(84, 52, 10, 36, 4, '#8d6e63'),
      rect(14, 56, 80, 18, 5, '#ffffff'),
      ellipse(30, 52, 12, 7, '#fff3e0'),
      path('M42 46 H90 Q94 46 94 50 V70 H42 Z', '#64b5f6'),
      line('M42 58 H94', '#90caf9', 3),
      rect(14, 72, 80, 8, 3, '#a1887f'),
    ],
  },
  {
    id: 'moon',
    label: $localize`:@@routineIcon.moon:Lune`,
    withCharacter: true,
    shapes: [
      path('M58 14 A36 36 0 1 0 86 70 A30 30 0 1 1 58 14 Z', '#ffd54f'),
      star(78, 22, 7, 3, '#fff59d'),
      star(86, 44, 4, 1.8, '#fff59d'),
      star(20, 20, 5, 2.2, '#fff59d'),
    ],
  },
  {
    id: 'sun',
    label: $localize`:@@routineIcon.sun:Soleil`,
    shapes: [
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i;
        const [x1, y1, x2, y2] = [50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a), 50 + 42 * Math.cos(a), 50 + 42 * Math.sin(a)];
        return line(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`, '#ffb300', 6);
      }),
      circle(50, 50, 22, '#ffca28'),
      circle(43, 47, 2.5, INK),
      circle(57, 47, 2.5, INK),
      line('M42 56 Q50 63 58 56', INK, 2.5),
    ],
  },
  {
    id: 'finish',
    label: $localize`:@@routineIcon.finish:Fini !`,
    withCharacter: true,
    shapes: [
      star(50, 54, 40, 18, '#ffca28'),
      star(50, 54, 26, 12, '#ffd54f'),
      star(16, 16, 6, 2.5, '#ffb300'),
      star(86, 20, 5, 2, '#ffb300'),
      star(88, 84, 4, 1.8, '#ffb300'),
    ],
  },
  {
    id: 'clock',
    label: $localize`:@@routineIcon.clock:Horloge`,
    shapes: [
      circle(50, 50, 40, '#90caf9'),
      circle(50, 50, 32, '#ffffff'),
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI / 6) * i;
        return circle(50 + 26 * Math.cos(a), 50 + 26 * Math.sin(a), i % 3 ? 1.5 : 2.8, '#546e7a');
      }),
      line('M50 50 V30', INK, 4),
      line('M50 50 L64 56', INK, 4),
      circle(50, 50, 3.5, '#e53935'),
    ],
  },
  {
    id: 'coat',
    label: $localize`:@@routineIcon.coat:Manteau`,
    shapes: [
      path('M30 18 L42 12 H58 L70 18 L86 36 L76 48 V90 H24 V48 L14 36 Z', '#8d6e63'),
      path('M42 12 L50 26 L58 12', 'none', { stroke: '#6d4c41', sw: 4 }),
      line('M50 26 V90', '#6d4c41', 3),
      ...[40, 56, 72].map((y) => circle(56, y, 3, '#ffcc80')),
      rect(28, 60, 14, 12, 3, '#795548'),
    ],
  },
  {
    id: 'glasses',
    label: $localize`:@@routineIcon.glasses:Lunettes`,
    shapes: [
      circle(30, 54, 17, '#e3f2fd'),
      circle(70, 54, 17, '#e3f2fd'),
      circle(30, 54, 17, 'none', { stroke: '#37474f', sw: 5 }),
      circle(70, 54, 17, 'none', { stroke: '#37474f', sw: 5 }),
      line('M47 52 Q50 46 53 52', '#37474f', 5),
      line('M13 50 L6 42', '#37474f', 5),
      line('M87 50 L94 42', '#37474f', 5),
    ],
  },
  {
    id: 'medicine',
    label: $localize`:@@routineIcon.medicine:Médicament`,
    shapes: [
      rect(30, 10, 40, 14, 5, '#ffffff', { stroke: '#cfd8dc', sw: 2 }),
      rect(26, 22, 48, 68, 12, '#ffb300'),
      rect(26, 40, 48, 32, 0, '#fff8e1'),
      rect(46, 46, 8, 20, 2, '#e53935'),
      rect(40, 52, 20, 8, 2, '#e53935'),
    ],
  },
  {
    id: 'pet',
    label: $localize`:@@routineIcon.pet:Animal`,
    shapes: [
      ellipse(24, 40, 11, 20, '#8d6e63'),
      ellipse(76, 40, 11, 20, '#8d6e63'),
      circle(50, 54, 30, '#bcaaa4'),
      ellipse(50, 66, 14, 10, '#efebe9'),
      circle(40, 48, 4, INK),
      circle(60, 48, 4, INK),
      ellipse(50, 60, 6, 4.5, INK),
      path('M46 70 Q50 82 54 70 Z', '#f48fb1'),
    ],
  },
  {
    id: 'toys',
    label: $localize`:@@routineIcon.toys:Ranger les jouets`,
    shapes: [
      circle(32, 38, 13, '#ef5350'),
      path('M20 34 Q32 44 44 34', 'none', { stroke: '#ffffff', sw: 3 }),
      rect(54, 22, 22, 22, 4, '#42a5f5'),
      rect(60, 28, 10, 10, 2, '#bbdefb'),
      rect(12, 48, 76, 42, 8, '#ffb74d'),
      rect(8, 44, 84, 12, 6, '#ffa726'),
      rect(40, 64, 20, 6, 3, '#fb8c00'),
    ],
  },
];

const BY_ID = new Map(ROUTINE_ICONS.map((icon) => [icon.id, icon]));
/** Icône inconnue (supprimée du catalogue) : une étoile. */
const FALLBACK = BY_ID.get('finish')!;

export function routineIcon(id: string | undefined | null): RoutineIcon {
  return (id && BY_ID.get(id)) || FALLBACK;
}
