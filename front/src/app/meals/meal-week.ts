import { MealDTO } from '../api-client';
import { addDays, toIsoDate } from '../shared/date-utils';
import { MEAL_SLOTS, MealSlot } from '../shared/labels';

export interface MealCell {
  slot: MealSlot;
  meal?: MealDTO;
}

export interface MealDay {
  date: Date;
  iso: string;
  cells: MealCell[];
}

/** Grille d'une semaine : 7 jours à partir de `monday`, chacun avec ses 3 créneaux (repas ou case vide). */
export function buildMealWeek(monday: Date, meals: MealDTO[]): MealDay[] {
  const byKey = new Map(meals.map((m) => [`${m.date}|${m.creneau}`, m]));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const iso = toIsoDate(date);
    return { date, iso, cells: MEAL_SLOTS.map((slot) => ({ slot, meal: byKey.get(`${iso}|${slot}`) })) };
  });
}
