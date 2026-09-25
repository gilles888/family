import { ChangeDetectionStrategy, Component, effect, inject, untracked, viewChild } from '@angular/core';
import { MealsWeekCard } from '../../meals/meals-week-card';
import { AgendaCardsContext } from '../agenda-cards-context';

/** Carte « Repas de la semaine » : les dialogues sont ouverts par l'agenda, la grille se recharge après chaque changement. */
@Component({
  selector: 'app-meals-card',
  imports: [MealsWeekCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-meals-week-card (addMeal)="agenda.newMeal($event)" (mealClick)="agenda.openMeal($event)" />`,
})
export class MealsCard {
  protected readonly agenda = inject(AgendaCardsContext);
  private readonly card = viewChild.required(MealsWeekCard);

  constructor() {
    // À la création, la carte charge elle-même sa semaine : seuls les changements suivants la rechargent.
    let seen = untracked(this.agenda.mealsVersion);
    effect(() => {
      const version = this.agenda.mealsVersion();
      if (version !== seen) {
        seen = version;
        untracked(() => this.card().reload());
      }
    });
  }
}
