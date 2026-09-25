import { ShoppingItemDTO } from '../api-client';
import { groupByAisle, isToBuy } from './shopping-list';

function item(nom: string, rayon: ShoppingItemDTO['rayon'] = null, extra: Partial<ShoppingItemDTO> = {}): ShoppingItemDTO {
  return { id: Math.random(), nom, rayon, achete: false, aLaMaison: false, ...extra };
}

describe('groupByAisle', () => {
  it('suit l’ordre des rayons du magasin, sans rayon en dernier', () => {
    const groups = groupByAisle(
      [item('Papier toilette'), item('Lait', 'CREMERIE'), item('Tomates', 'FRUITS_LEGUMES')],
      'fr',
    );
    expect(groups.map((g) => g.aisle)).toEqual(['FRUITS_LEGUMES', 'CREMERIE', null]);
  });

  it('trie par ordre alphabétique dans un rayon, sans tenir compte des accents ni de la casse', () => {
    const groups = groupByAisle([item('oignon', 'EPICERIE'), item('Épices', 'EPICERIE'), item('Ail', 'EPICERIE')], 'fr');
    expect(groups[0].items.map((i) => i.nom)).toEqual(['Ail', 'Épices', 'oignon']);
  });

  it('liste vide : aucun groupe', () => {
    expect(groupByAisle([], 'fr')).toEqual([]);
  });
});

describe('isToBuy', () => {
  it('exclut les articles achetés et ceux déjà à la maison', () => {
    expect(isToBuy(item('Lait'))).toBe(true);
    expect(isToBuy(item('Lait', null, { achete: true }))).toBe(false);
    expect(isToBuy(item('Sel', null, { aLaMaison: true }))).toBe(false);
  });
});
