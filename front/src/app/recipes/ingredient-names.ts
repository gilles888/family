/**
 * Clé de comparaison d'un nom d'ingrédient, identique à celle du backend (IngredientService.normaliser) :
 * sans casse, accents, ligatures ni espaces superflus. « Œufs » et « oeufs » sont le même ingrédient.
 */
export function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae');
}

/** Noms (tels que saisis) qui apparaissent plusieurs fois, au sens de normalizeIngredientName. */
export function duplicateIngredientNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const name of names) {
    const key = normalizeIngredientName(name);
    if (key && seen.has(key) && !duplicates.some((d) => normalizeIngredientName(d) === key)) {
      duplicates.push(name.trim());
    }
    seen.add(key);
  }
  return duplicates;
}
