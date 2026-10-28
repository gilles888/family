import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EtoilesService, RoutineHistoryDTO, RoutinesService, StarPenaltyDTO } from '../api-client';
import { ParentOnly } from '../auth/parent-only.directive';
import { parseIsoDate, toIsoDate } from '../shared/date-utils';
import { ConfirmDialog, ConfirmDialogData } from '../shared/confirm-dialog';
import { NotificationService } from '../shared/notification.service';
import { PENALTY_REASON_LABELS } from './routine-labels';
import { balance, dayStars, penaltiesSummary, periodStars } from './star-balance';
import { StarPenaltyDialog, StarPenaltyDialogData } from './star-penalty-dialog';

const DAYS = 14;
/** Étoiles dessinées au plus par jour ; au-delà, un nombre. */
const MAX_STARS = 3;

interface Day {
  date: Date;
  count: number;
  /** Étoiles retirées par un parent ce jour-là (affichées en rouge, jamais cachées). */
  removed: number;
  penalties: StarPenaltyDTO[];
  /** Motifs des retraits, au survol ou au toucher. */
  why: string;
  today: boolean;
}

/**
 * Les 14 derniers jours d'un membre : une étoile par routine terminée, et en rouge celles qu'un parent a retirées
 * (avec le motif). Le total est le solde : gagnées moins retirées. Les parents peuvent retirer des étoiles et annuler un retrait.
 */
@Component({
  selector: 'app-routine-history',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTooltipModule, ParentOnly],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="heading" i18n="@@routineHistory.title">Mes 14 derniers jours</h3>
    @if (days().length) {
      <ol class="days">
        @for (d of days(); track d.date.getTime()) {
          <li class="day" [class.today]="d.today" [class.done]="d.count > 0" [attr.aria-label]="(d.date | date: 'EEEE d MMMM') + ' : ' + d.count + ' ⭐' + (d.removed ? ' −' + d.removed + ' ⭐ (' + d.why + ')' : '')">
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
            @if (d.removed) {
              <button type="button" class="lost" #tip="matTooltip" [matTooltip]="d.why" (click)="tip.toggle()" [attr.aria-label]="d.why">−{{ d.removed }}⭐</button>
            }
          </li>
        }
      </ol>
      <p class="total" i18n="@@routineHistory.total">{total(), plural, =0 {Pas encore d'étoile : à toi de jouer !} =1 {1 étoile gagnée} other {{{ total() }} étoiles gagnées}}</p>
      @if (removed() > 0) {
        <p class="lost-total" i18n="@@routineHistory.removed">{removed(), plural, =1 {1 étoile retirée} other {{{ removed() }} étoiles retirées}}</p>
      }
      <ng-container *appParentOnly>
        <button matButton="outlined" class="take" (click)="openPenalty()">
          <mat-icon>remove_circle_outline</mat-icon>
          <ng-container i18n="@@routineHistory.take">Retirer des étoiles</ng-container>
        </button>
        @if (penalties().length) {
          <ul class="penalties">
            @for (p of penalties(); track p.id) {
              <li>
                <span class="when">{{ p.date! | date: 'EEE d MMM' }}</span>
                <span class="what"><b class="lost">−{{ p.nombre }}⭐</b> {{ reasonLabels[p.motif!] }}@if (p.commentaire) { : {{ p.commentaire }} }</span>
                <button matIconButton (click)="cancel(p)" i18n-aria-label="@@routineHistory.cancelPenalty" aria-label="Annuler ce retrait" i18n-title="@@routineHistory.cancelPenalty" title="Annuler ce retrait">
                  <mat-icon>undo</mat-icon>
                </button>
              </li>
            }
          </ul>
        }
      </ng-container>
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
    .lost,
    .lost-total {
      color: #c62828;
    }
    .lost-total {
      margin: 2px 0 0;
      font: 600 14px / 1.3 Roboto;
    }
    button.lost {
      border: 0;
      padding: 0 4px;
      border-radius: 8px;
      background: #ffebee;
      font: 700 12px / 1.4 Roboto;
      cursor: pointer;
    }
    .take {
      margin-top: 8px;
    }
    .penalties {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
      font: var(--mat-sys-body-medium);
    }
    .penalties li {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .penalties .when {
      min-width: 72px;
      color: var(--mat-sys-on-surface-variant);
    }
    .penalties .what {
      flex: 1;
    }
  `,
})
export class RoutineHistory {
  private readonly api = inject(RoutinesService);
  private readonly starsApi = inject(EtoilesService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly reasonLabels = PENALTY_REASON_LABELS;

  readonly memberId = input.required<number>();
  readonly memberName = input('');
  /** Changer ce nombre recharge l'historique (ex. une routine vient d'être finie). */
  readonly version = input(0);

  protected readonly maxStars = MAX_STARS;
  private readonly history = rxResource<RoutineHistoryDTO[], { id: number; version: number }>({
    params: () => ({ id: this.memberId(), version: this.version() }),
    stream: ({ params }) => this.api.historiqueRoutinesMembre(params.id, DAYS),
  });

  private readonly entries = computed(() => (this.history.hasValue() ? this.history.value() : []));

  protected readonly days = computed<Day[]>(() => {
    const todayIso = toIsoDate(new Date());
    return this.entries().map((h) => {
      const { earned, removed } = dayStars(h);
      const penalties = h.retraits ?? [];
      return {
        date: parseIsoDate(h.date!),
        count: earned,
        removed,
        penalties,
        why: penaltiesSummary(penalties, PENALTY_REASON_LABELS),
        today: h.date === todayIso,
      };
    });
  });
  private readonly period = computed(() => periodStars(this.entries()));
  /** Solde : étoiles gagnées moins étoiles retirées, jamais négatif. */
  protected readonly total = computed(() => balance(this.period()));
  protected readonly removed = computed(() => this.period().removed);
  /** Retraits de la période, les plus récents d'abord (pour les annuler). */
  protected readonly penalties = computed(() => this.entries().flatMap((h) => h.retraits ?? []).reverse());

  protected stars(count: number): number[] {
    return Array.from({ length: count });
  }

  protected openPenalty(): void {
    this.dialog
      .open<StarPenaltyDialog, StarPenaltyDialogData, boolean>(StarPenaltyDialog, {
        data: { memberId: this.memberId(), memberName: this.memberName() },
        width: '420px',
        maxWidth: '100vw',
      })
      .afterClosed()
      .subscribe((done) => done && this.history.reload());
  }

  protected cancel(penalty: StarPenaltyDTO): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: $localize`:@@routineHistory.cancelTitle:Annuler ce retrait ?`,
          message: $localize`:@@routineHistory.cancelMessage:Les étoiles retirées sont rendues.`,
          confirmLabel: $localize`:@@routineHistory.cancelConfirm:Annuler le retrait`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.starsApi.annulerRetraitEtoiles(this.memberId(), penalty.id!).subscribe(() => {
            this.notifications.success($localize`:@@routineHistory.cancelled:Retrait annulé.`);
            this.history.reload();
          });
        }
      });
  }
}
