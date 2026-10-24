import { RoutineDTO } from '../api-client';
import { copyRequest } from './routine-labels';

describe('copyRequest', () => {
  it('copie la routine chez un autre membre, avec de nouvelles étapes', () => {
    const routine: RoutineDTO = {
      id: 3,
      membreId: 1,
      nom: 'Mes devoirs',
      type: 'CUSTOM',
      theme: 'DAY',
      jours: ['SATURDAY'],
      heureDebut: '14:30:00',
      heureFin: '15:30:00',
      active: true,
      position: 0,
      etapes: [{ id: 12, position: 0, libelle: 'Je fais mes devoirs.', icone: 'homework', couleur: '#FDE2E4' }],
    };

    const request = copyRequest(routine, 2, 'Mes devoirs');

    expect(request.membreId).toBe(2);
    expect(request.heureDebut).toBe('14:30');
    expect(request.jours).toEqual(['SATURDAY']);
    expect(request.etapes).toEqual([{ id: undefined, libelle: 'Je fais mes devoirs.', icone: 'homework', couleur: '#FDE2E4' }]);
  });
});
