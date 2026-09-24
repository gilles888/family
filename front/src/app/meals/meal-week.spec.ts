import { MealDTO } from '../api-client';
import { buildMealWeek } from './meal-week';

describe('buildMealWeek', () => {
  const meal = (date: string, creneau: MealDTO['creneau'], titre: string): MealDTO => ({ id: 1, date, creneau, titre, portions: 4 });

  it('construit 7 jours × 3 créneaux et place chaque repas dans sa case', () => {
    const week = buildMealWeek(new Date(2026, 8, 21), [
      meal('2026-09-21', 'SOUPER', 'Spaghetti'),
      meal('2026-09-27', 'PETIT_DEJEUNER', 'Crêpes'),
      meal('2026-09-28', 'MIDI', 'Hors semaine'),
    ]);

    expect(week.map((d) => d.iso)).toEqual([
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27',
    ]);
    expect(week[0].cells.map((c) => c.slot)).toEqual(['PETIT_DEJEUNER', 'MIDI', 'SOUPER']);
    expect(week[0].cells.map((c) => c.meal?.titre)).toEqual([undefined, undefined, 'Spaghetti']);
    expect(week[6].cells[0].meal?.titre).toBe('Crêpes');
    expect(week.flatMap((d) => d.cells).filter((c) => c.meal)).toHaveLength(2);
  });
});
