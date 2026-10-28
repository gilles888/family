import { RoutineHistoryDTO } from '../api-client';
import { balance, dayStars, penaltiesSummary, periodStars } from './star-balance';

const day = (terminees: number, retraits: number[]): RoutineHistoryDTO => ({
  date: '2026-09-24',
  routinesTerminees: Array.from({ length: terminees }, (_, i) => i + 1),
  retraits: retraits.map((nombre, i) => ({ id: i + 1, date: '2026-09-24', nombre, motif: 'DISPUTE' })),
});

describe('étoiles', () => {
  it('compte les étoiles gagnées et retirées d\'un jour', () => {
    expect(dayStars(day(2, [1, 2]))).toEqual({ earned: 2, removed: 3 });
    expect(dayStars({ date: '2026-09-24' })).toEqual({ earned: 0, removed: 0 });
  });

  it('additionne une période', () => {
    expect(periodStars([day(1, []), day(2, [1]), day(0, [2])])).toEqual({ earned: 3, removed: 3 });
  });

  it('solde = gagnées − retirées, jamais négatif', () => {
    expect(balance({ earned: 5, removed: 2 })).toBe(3);
    expect(balance({ earned: 1, removed: 4 })).toBe(0);
  });

  it('résume les retraits d\'un jour', () => {
    const text = penaltiesSummary(
      [
        { id: 1, nombre: 2, motif: 'DISPUTE' },
        { id: 2, nombre: 1, motif: 'AUTRE', commentaire: 'porte claquée' },
      ],
      { DISPUTE: 'Dispute', AUTRE: 'Autre' },
    );
    expect(text).toBe('Dispute (−2) · Autre : porte claquée (−1)');
  });
});
