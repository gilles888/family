import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, output, signal } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { HttpContext } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MealDTO, RepasService } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { addDays, startOfDay, startOfWeek, toIsoDate } from '../shared/date-utils';
import { MEAL_SLOTS, MealSlot, SLOT_LABELS, SLOT_SHORT_LABELS } from '../shared/labels';
import { MealCell, MealDay, buildMealWeek } from './meal-week';

/** Demande d'ajout d'un repas dans une case vide. */
export interface MealSlotRequest {
  date: Date;
  slot: MealSlot;
}

/**
 * Carte « Repas de la semaine » (page Mobile) : grille lundi → dimanche × créneaux. Clic sur une case vide = ajouter,
 * clic sur un repas = l'ouvrir. Les dialogues sont ouverts par l'agenda (voir dashboard/cards/meals-card.ts),
 * qui recharge ensuite la grille via reload().
 */
@Component({
  selector: 'app-meals-week-card',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meals-week-card.html',
  styleUrl: './meals-week-card.scss',
})
export class MealsWeekCard {
  private readonly repasApi = inject(RepasService);
  private readonly locale = inject(LOCALE_ID);

  readonly addMeal = output<MealSlotRequest>();
  readonly mealClick = output<MealDTO>();

  protected readonly slots = MEAL_SLOTS;
  protected readonly slotLabels = SLOT_LABELS;
  protected readonly slotShortLabels = SLOT_SHORT_LABELS;
  protected readonly todayIso = toIsoDate(new Date());

  protected readonly monday = signal(startOfWeek(startOfDay(new Date())));
  protected readonly sunday = computed(() => addDays(this.monday(), 6));
  protected readonly isCurrentWeek = computed(() => toIsoDate(this.monday()) === toIsoDate(startOfWeek(new Date())));

  /** L'erreur est affichée dans la carte (pas de snack-bar). */
  protected readonly meals = rxResource<MealDTO[], Date>({
    params: () => this.monday(),
    stream: ({ params: monday }) =>
      this.repasApi.listRepas(toIsoDate(monday), toIsoDate(addDays(monday, 6)), 'body', false, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      }),
  });

  protected readonly week = computed<MealDay[]>(() =>
    buildMealWeek(this.monday(), this.meals.hasValue() ? this.meals.value() : []),
  );

  protected step(direction: 1 | -1): void {
    this.monday.update((d) => addDays(d, 7 * direction));
  }

  protected goToCurrentWeek(): void {
    this.monday.set(startOfWeek(startOfDay(new Date())));
  }

  protected open(day: MealDay, cell: MealCell): void {
    if (cell.meal) {
      this.mealClick.emit(cell.meal);
    } else {
      this.addMeal.emit({ date: day.date, slot: cell.slot });
    }
  }

  /** Libellé accessible d'une case vide, ex. « Ajouter un repas : mardi 22, Souper ». */
  protected addLabel(day: MealDay, slot: MealSlot): string {
    const dayName = formatDate(day.date, 'EEEE d', this.locale);
    return $localize`:@@meals.addAria:Ajouter un repas : ${dayName}:day:, ${SLOT_LABELS[slot]}:slot:`;
  }

  /** Recharge la semaine affichée (après un ajout, une modification ou une suppression). */
  reload(): void {
    this.meals.reload();
  }
}
