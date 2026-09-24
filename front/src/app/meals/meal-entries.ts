import { AgendaEntryDTO, MealDTO } from '../api-client';
import { MealSlot } from '../shared/labels';

/** Heure fictive de chaque créneau, pour placer les repas dans le calendrier (durée par défaut des vues). */
export const MEAL_SLOT_TIMES: Record<MealSlot, string> = {
  PETIT_DEJEUNER: '08:00',
  MIDI: '12:00',
  SOUPER: '18:30',
};

/** Couleur dédiée aux repas dans l'agenda (variables du thème, lisibles en clair comme en sombre). */
export const MEAL_COLOR = 'var(--mat-sys-tertiary)';
export const MEAL_BACKGROUND = 'var(--mat-sys-tertiary-container)';
export const MEAL_TEXT = 'var(--mat-sys-on-tertiary-container)';

const mealsByEntry = new WeakMap<AgendaEntryDTO, MealDTO>();

/**
 * Entrée d'agenda synthétique représentant un repas : les vues jour / semaine / mois l'affichent comme les autres
 * (placement, tri) ; `mealOf` permet de la reconnaître pour la styler et l'ouvrir. Son id est négatif pour ne
 * jamais entrer en collision avec celui d'une vraie entrée.
 */
export function mealEntry(meal: MealDTO): AgendaEntryDTO {
  const entry: AgendaEntryDTO = {
    id: -meal.id!,
    titre: meal.titre,
    dateHeure: `${meal.date}T${MEAL_SLOT_TIMES[meal.creneau!]}:00`,
    statut: 'PREVU',
    membres: [],
    recurring: false,
  };
  mealsByEntry.set(entry, meal);
  return entry;
}

/** Le repas représenté par cette entrée, ou undefined pour une vraie entrée d'agenda. */
export function mealOf(entry: AgendaEntryDTO): MealDTO | undefined {
  return mealsByEntry.get(entry);
}

/** Entrées triées par date-heure (chaînes ISO locales : l'ordre alphabétique est l'ordre chronologique). */
export function byDateTime(a: AgendaEntryDTO, b: AgendaEntryDTO): number {
  return (a.dateHeure ?? '').localeCompare(b.dateHeure ?? '');
}
