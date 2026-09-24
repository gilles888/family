import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MonthSummaryDTO, YearSummaryDTO } from '../api-client';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { REMINDER_TYPES } from '../shared/labels';

interface MonthCard {
  /** 1..12 */
  month: number;
  date: Date;
  total: number;
  byType: { type: string; count: number }[];
}

/** Vue Année : 12 mois avec leur nombre d'entrées (total et par type), cliquables. */
@Component({
  selector: 'app-year-view',
  imports: [DatePipe, MatCardModule, EnumLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './year-view.html',
  styleUrl: './year-view.scss',
})
export class YearView {
  readonly summary = input.required<YearSummaryDTO>();
  readonly year = input.required<number>();
  readonly monthClick = output<number>();

  protected readonly today = new Date();

  protected readonly months = computed<MonthCard[]>(() => {
    const byMonth = new Map<number, MonthSummaryDTO>((this.summary().mois ?? []).map((m) => [m.mois!, m]));
    return Array.from({ length: 12 }, (_, i) => {
      const s = byMonth.get(i + 1);
      return {
        month: i + 1,
        date: new Date(this.year(), i, 1),
        total: s?.total ?? 0,
        byType: REMINDER_TYPES.map((type) => ({ type, count: s?.parType?.[type] ?? 0 })).filter((t) => t.count > 0),
      };
    });
  });

  protected isCurrent(m: MonthCard): boolean {
    return m.date.getFullYear() === this.today.getFullYear() && m.month === this.today.getMonth() + 1;
  }
}
