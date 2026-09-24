import { AgendaEntryDTO } from '../api-client';
import { mealEntry, mealOf } from './meal-entries';

describe('mealEntry', () => {
  it('place le repas à l’heure fictive de son créneau et le retrouve', () => {
    const meal = { id: 7, date: '2026-09-24', creneau: 'SOUPER' as const, titre: 'Soupe', portions: 4 };

    const entry = mealEntry(meal);

    expect(entry.id).toBe(-7);
    expect(entry.titre).toBe('Soupe');
    expect(entry.dateHeure).toBe('2026-09-24T18:30:00');
    expect(mealOf(entry)).toBe(meal);
    expect(mealOf({ id: 7, dateHeure: '2026-09-24T18:30:00' } as AgendaEntryDTO)).toBeUndefined();
  });
});
