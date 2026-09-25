import { Signal } from '@angular/core';
import { AgendaEntryDTO, FamilyMemberDTO, MealDTO } from '../api-client';
import { MealSlotRequest } from '../meals/meals-week-card';

/**
 * Données et actions de la page agenda dont les cartes ont besoin. Fourni par AgendaPage : les cartes réutilisent
 * ce qu'elle a déjà chargé (pas de second appel à l'API) et lui laissent l'ouverture des dialogues.
 */
export abstract class AgendaCardsContext {
  /** Tâches de la période affichée par l'agenda. */
  abstract readonly tasks: Signal<AgendaEntryDTO[]>;
  abstract readonly familyMembers: Signal<FamilyMemberDTO[]>;
  /** Incrémenté à chaque ajout, modification ou suppression d'un repas. */
  abstract readonly mealsVersion: Signal<number>;

  abstract openEntry(entry: AgendaEntryDTO): void;
  abstract newMeal(request: MealSlotRequest): void;
  abstract openMeal(meal: MealDTO): void;
}
