import { AgendaEntryDTO } from '../api-client';
import { HOUR_PX, layoutDay } from './week-layout';

const entry = (id: number, from: string, to?: string): AgendaEntryDTO => ({
  id,
  dateHeure: `2026-09-22T${from}:00`,
  dateHeureFin: to ? `2026-09-22T${to}:00` : undefined,
});

describe('layoutDay', () => {
  it('positionne une entrée selon son heure et sa durée', () => {
    const [p] = layoutDay([entry(1, '09:30', '11:00')]);
    expect(p.top).toBe(9.5 * HOUR_PX);
    expect(p.height).toBe(1.5 * HOUR_PX);
    expect([p.lane, p.lanes]).toEqual([0, 1]);
  });

  it('applique une durée par défaut quand il n\'y a pas de fin', () => {
    const [p] = layoutDay([entry(1, '08:00')]);
    expect(p.height).toBe(0.75 * HOUR_PX);
  });

  it('place côte à côte les entrées qui se chevauchent', () => {
    const placed = layoutDay([entry(1, '10:00', '12:00'), entry(2, '11:00', '12:30'), entry(3, '11:30', '13:00')]);
    expect(placed.map((p) => p.lane)).toEqual([0, 1, 2]);
    expect(placed.every((p) => p.lanes === 3)).toBe(true);
  });

  it('réutilise une colonne libre et ne mélange pas des groupes indépendants', () => {
    const placed = layoutDay([entry(1, '08:00', '09:00'), entry(2, '08:30', '10:00'), entry(3, '09:15', '09:45'), entry(4, '14:00', '15:00')]);
    const byId = new Map(placed.map((p) => [p.entry.id, p]));
    expect(byId.get(3)!.lane).toBe(0); // la colonne 0 est libre depuis 9h00
    expect(byId.get(1)!.lanes).toBe(2);
    expect(byId.get(4)).toMatchObject({ lane: 0, lanes: 1 });
  });

  it('coupe à minuit une entrée qui se termine le lendemain', () => {
    const [p] = layoutDay([{ id: 1, dateHeure: '2026-09-22T23:00:00', dateHeureFin: '2026-09-23T01:00:00' }]);
    expect(p.top + p.height).toBe(24 * HOUR_PX);
  });
});
