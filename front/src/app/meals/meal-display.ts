import { Injectable, signal } from '@angular/core';

/** Où afficher les repas : dans le calendrier de l'agenda, ou dans la carte « Repas de la semaine » de la page Mobile. */
export type MealDisplayMode = 'agenda' | 'card';

const MODE_KEY = 'family-agenda.meals.display';
const VISIBLE_KEY = 'family-agenda.meals.visibleInAgenda';

/**
 * Préférences d'affichage des repas. Il n'y a pas de préférences utilisateur côté backend : elles sont gardées
 * dans le navigateur (localStorage), avec des valeurs par défaut si le stockage est indisponible.
 */
@Injectable({ providedIn: 'root' })
export class MealDisplayPreference {
  readonly mode = signal<MealDisplayMode>(read(MODE_KEY) === 'agenda' ? 'agenda' : 'card');
  /** Mode agenda : filtre pour masquer les repas du calendrier. */
  readonly visibleInAgenda = signal(read(VISIBLE_KEY) !== 'false');

  setMode(mode: MealDisplayMode): void {
    this.mode.set(mode);
    write(MODE_KEY, mode);
  }

  setVisibleInAgenda(visible: boolean): void {
    this.visibleInAgenda.set(visible);
    write(VISIBLE_KEY, String(visible));
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // stockage indisponible (navigation privée, quota) : la préférence vaut pour cette session seulement
  }
}
