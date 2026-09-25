import { ShoppingItemDTO } from '../api-client';
import { AISLES, Aisle } from '../shared/labels';

/** Articles d'un rayon ; `aisle` null = rayon inconnu. */
export interface AisleGroup {
  aisle: Aisle | null;
  items: ShoppingItemDTO[];
}

/** À acheter : ni coché, ni déjà à la maison. */
export function isToBuy(item: ShoppingItemDTO): boolean {
  return !item.achete && !item.aLaMaison;
}

/**
 * Regroupe par rayon, dans l'ordre du magasin (`AISLES`), les articles sans rayon en dernier ;
 * par ordre alphabétique dans un rayon (selon la langue de l'interface).
 */
export function groupByAisle(items: ShoppingItemDTO[], locale: string): AisleGroup[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const byAisle = new Map<Aisle | null, ShoppingItemDTO[]>();
  for (const item of items) {
    const aisle = item.rayon ?? null;
    byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), item]);
  }
  return [...AISLES, null]
    .filter((aisle) => byAisle.has(aisle))
    .map((aisle) => ({
      aisle,
      items: byAisle.get(aisle)!.sort((a, b) => collator.compare(a.nom ?? '', b.nom ?? '')),
    }));
}
