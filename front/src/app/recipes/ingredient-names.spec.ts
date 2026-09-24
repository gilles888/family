import { duplicateIngredientNames, normalizeIngredientName } from './ingredient-names';

describe('normalizeIngredientName', () => {
  it('ignore casse, accents, ligatures et espaces superflus', () => {
    expect(normalizeIngredientName('  Crème   Fraîche ')).toBe('creme fraiche');
    expect(normalizeIngredientName('ŒUFS')).toBe('oeufs');
    expect(normalizeIngredientName('Haché bœuf')).toBe('hache boeuf');
  });
});

describe('duplicateIngredientNames', () => {
  it('signale chaque doublon une seule fois, sans tenir compte des lignes vides', () => {
    expect(duplicateIngredientNames(['Œufs', 'Lait', 'oeufs', 'OEUFS', '', ''])).toEqual(['oeufs']);
    expect(duplicateIngredientNames(['Farine', 'Sucre'])).toEqual([]);
  });
});
