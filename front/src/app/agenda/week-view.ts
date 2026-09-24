import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AgendaEntryDTO } from '../api-client';
import { addDays, isSameDay, parseIsoDate, toIsoDate } from '../shared/date-utils';
import { contrastColor, entryColor } from '../shared/entry-utils';
import { HOUR_PX, PlacedEntry, layoutDay } from './week-layout';
import { EntryChip } from './entry-chip';

interface DayColumn {
  date: Date;
  placed: PlacedEntry[];
}

/** Vue Semaine : 7 colonnes (lundi -> dimanche), entrées positionnées par jour et par heure. */
@Component({
  selector: 'app-week-view',
  imports: [DatePipe, EntryChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './week-view.html',
  styleUrl: './week-view.scss',
})
export class WeekView implements AfterViewInit {
  /** Lundi de la semaine affichée. */
  readonly weekStart = input.required<Date>();
  readonly entries = input.required<AgendaEntryDTO[]>();

  readonly dayClick = output<Date>();
  readonly entryClick = output<AgendaEntryDTO>();

  protected readonly hourPx = HOUR_PX;
  protected readonly hours = Array.from({ length: 24 }, (_, h) => new Date(2024, 0, 1, h));
  protected readonly today = new Date();
  protected readonly entryColor = entryColor;
  protected readonly contrastColor = contrastColor;
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  protected readonly columns = computed<DayColumn[]>(() => {
    const byDay = new Map<string, AgendaEntryDTO[]>();
    for (const e of this.entries()) {
      const key = toIsoDate(parseIsoDate(e.dateHeure!));
      byDay.set(key, [...(byDay.get(key) ?? []), e]);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.weekStart(), i);
      return { date, placed: layoutDay(byDay.get(toIsoDate(date)) ?? []) };
    });
  });

  ngAfterViewInit(): void {
    // Démarre la vue à 7h plutôt qu'à minuit
    this.scroller().nativeElement.scrollTop = 7 * HOUR_PX;
  }

  protected isToday(d: Date): boolean {
    return isSameDay(d, this.today);
  }
}
