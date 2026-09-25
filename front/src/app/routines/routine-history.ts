import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { RoutineHistoryDTO, RoutinesService } from '../api-client';
import { parseIsoDate, toIsoDate } from '../shared/date-utils';

const DAYS = 14;
/** Étoiles dessinées au plus par jour ; au-delà, un nombre. */
const MAX_STARS = 3;

interface Day {
  date: Date;
  count: number;
  today: boolean;
}

/** Les 14 derniers jours d'un membre : une étoile par routine terminée. */
@Component({
  selector: 'app-routine-history',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="heading" i18n="@@routineHistory.title">Mes 14 derniers jours</h3>
    @if (days().length) {
      <ol class="days">
        @for (d of days(); track d.date.getTime()) {
          <li class="day" [class.today]="d.today" [class.done]="d.count > 0" [attr.aria-label]="(d.date | date: 'EEEE d MMMM') + ' : ' + d.count + ' ⭐'">
            <span class="name" aria-hidden="true">{{ d.date | date: 'EEEEE' }}</span>
            <span class="num" aria-hidden="true">{{ d.date | date: 'd' }}</span>
            <span class="stars" aria-hidden="true">
              @if (d.count > maxStars) {
                ⭐{{ d.count }}
              } @else {
                @for (s of stars(d.count); track $index) {
                  <span>⭐</span>
                }
              }
            </span>
          </li>
        }
      </ol>
      <p class="total" i18n="@@routineHistory.total">{total(), plural, =0 {Pas encore d'étoile : à toi de jouer !} =1 {1 étoile gagnée} other {{{ total() }} étoiles gagnées}}</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .heading {
      margin: 0 0 8px;
      font: 700 18px / 1.2 Roboto;
    }
    .days {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
    .day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      min-height: 64px;
      padding: 4px 2px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container);
    }
    .day.done {
      background: #fff8e1;
    }
    .day.today {
      box-shadow: inset 0 0 0 2px var(--mat-sys-primary);
    }
    .name {
      font: var(--mat-sys-label-small);
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }
    .num {
      font: 700 15px / 1.1 Roboto;
    }
    .stars {
      font-size: 12px;
      line-height: 1.1;
      text-align: center;
      word-break: break-all;
    }
    .total {
      margin: 8px 0 0;
      font: 600 15px / 1.3 Roboto;
      color: #ef6c00;
    }
  `,
})
export class RoutineHistory {
  private readonly api = inject(RoutinesService);

  readonly memberId = input.required<number>();
  /** Changer ce nombre recharge l'historique (ex. une routine vient d'être finie). */
  readonly version = input(0);

  protected readonly maxStars = MAX_STARS;
  private readonly history = rxResource<RoutineHistoryDTO[], { id: number; version: number }>({
    params: () => ({ id: this.memberId(), version: this.version() }),
    stream: ({ params }) => this.api.historiqueRoutinesMembre(params.id, DAYS),
  });

  protected readonly days = computed<Day[]>(() => {
    const todayIso = toIsoDate(new Date());
    return (this.history.hasValue() ? this.history.value() : []).map((h) => ({
      date: parseIsoDate(h.date!),
      count: h.routinesTerminees?.length ?? 0,
      today: h.date === todayIso,
    }));
  });
  protected readonly total = computed(() => this.days().reduce((sum, d) => sum + d.count, 0));

  protected stars(count: number): number[] {
    return Array.from({ length: count });
  }
}
