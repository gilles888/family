import { addMonths, buildMonthGrid, parseIsoDateTime, startOfWeek, toIsoDate, toIsoDateTime } from './date-utils';

describe('date-utils', () => {
  it('formate et relit les dates en heure locale, sans décalage de fuseau', () => {
    const d = new Date(2026, 8, 22, 18, 5);
    expect(toIsoDate(d)).toBe('2026-09-22');
    expect(toIsoDateTime(d)).toBe('2026-09-22T18:05:00');
    expect(parseIsoDateTime('2026-09-22T18:05:00').getTime()).toBe(d.getTime());
  });

  it('démarre la semaine le lundi (dimanche compris dans la semaine précédente)', () => {
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 23)))).toBe('2026-09-21'); // mercredi
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 27)))).toBe('2026-09-21'); // dimanche
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 21)))).toBe('2026-09-21'); // lundi
  });

  it('ajoute des mois sans déborder sur le mois suivant', () => {
    expect(toIsoDate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(toIsoDate(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-15');
    expect(toIsoDate(addMonths(new Date(2026, 8, 20), 12))).toBe('2027-09-20');
  });

  it('construit la grille du mois en semaines complètes lundi -> dimanche', () => {
    const weeks = buildMonthGrid(2026, 9); // sept. 2026 : mardi 1er -> mercredi 30
    expect(weeks).toHaveLength(5);
    expect(toIsoDate(weeks[0][0])).toBe('2026-08-31');
    expect(toIsoDate(weeks[4][6])).toBe('2026-10-04');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // février 2027 commence un lundi et finit un dimanche : exactement 4 semaines
    expect(buildMonthGrid(2027, 2)).toHaveLength(4);
  });
});
