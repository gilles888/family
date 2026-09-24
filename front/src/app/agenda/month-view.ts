import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AgendaEntryDTO } from '../api-client';
import { buildMonthGrid, isSameDay, startOfWeek, toIsoDate, addDays } from '../shared/date-utils';
import { EntryChip } from './entry-chip';

const MAX_CHIPS_PER_DAY = 3;

/** Vue Mois : grille lundi -> dimanche ; noms des jours via DatePipe (Intl), jamais traduits à la main. */
@Component({
  selector: 'app-month-view',
  imports: [DatePipe, EntryChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month-view.html',
  styleUrl: './month-view.scss',
})
export class MonthView {
  readonly year = input.required<number>();
  /** 1..12 */
  readonly month = input.required<number>();
  /** Entrées groupées par jour ISO (yyyy-MM-dd), comme renvoyé par GET /v1/agenda/mois. */
  readonly entriesByDay = input.required<Record<string, AgendaEntryDTO[]>>();

  readonly dayClick = output<Date>();
  readonly entryClick = output<AgendaEntryDTO>();

  protected readonly today = new Date();
  protected readonly maxChips = MAX_CHIPS_PER_DAY;
  protected readonly weeks = computed(() => buildMonthGrid(this.year(), this.month()));
  protected readonly weekdays = computed(() => {
    const monday = startOfWeek(new Date(this.year(), this.month() - 1, 1));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  });

  protected entriesOf(day: Date): AgendaEntryDTO[] {
    return this.entriesByDay()[toIsoDate(day)] ?? [];
  }
  protected isToday(day: Date): boolean {
    return isSameDay(day, this.today);
  }
  protected inMonth(day: Date): boolean {
    return day.getMonth() === this.month() - 1;
  }
  protected key(day: Date): string {
    return toIsoDate(day);
  }
}
