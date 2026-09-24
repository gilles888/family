import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Observable, map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  AgendaEntryDTO,
  AgendaService,
  FamilyMemberDTO,
  MembresService,
  RemindersService,
  YearSummaryDTO,
} from '../api-client';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { NotificationService } from '../shared/notification.service';
import { addDays, addMonths, startOfDay, startOfWeek, toIsoDate } from '../shared/date-utils';
import { ReminderDialog, ReminderDialogData } from '../reminders/reminder-dialog';
import { DayView } from './day-view';
import { EntryDialog, EntryDialogResult } from './entry-dialog';
import { EntryList } from './entry-list';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { YearView } from './year-view';
import { WeatherCard } from '../weather/weather-card';

export type Mode = 'day' | 'week' | 'month' | 'year';

type AgendaData =
  | { kind: 'day'; entries: AgendaEntryDTO[] }
  | { kind: 'week'; entries: AgendaEntryDTO[] }
  | { kind: 'month'; byDay: Record<string, AgendaEntryDTO[]> }
  | { kind: 'year'; summary: YearSummaryDTO };

/** Filtre membre : 'all' = tout le monde, sinon l'id du membre. */
type MemberFilter = 'all' | number;

@Component({
  selector: 'app-agenda-page',
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    DayView,
    EntryList,
    WeekView,
    MonthView,
    YearView,
    WeatherCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-page.html',
  styleUrl: './agenda-page.scss',
})
export class AgendaPage {
  private readonly agendaApi = inject(AgendaService);
  private readonly remindersApi = inject(RemindersService);
  private readonly membresApi = inject(MembresService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly mode = signal<Mode>('month');
  /** Jour de référence : la vue affichée (jour / semaine / mois / année) est celle qui le contient. */
  protected readonly date = signal(startOfDay(new Date()));
  protected readonly memberFilter = signal<MemberFilter>('all');

  protected readonly members = rxResource<FamilyMemberDTO[], void>({
    stream: () => this.membresApi.listMembres(),
  });
  protected readonly data = rxResource<
    AgendaData,
    { mode: Mode; date: Date; filter: MemberFilter }
  >({
    params: () => ({ mode: this.mode(), date: this.date(), filter: this.memberFilter() }),
    stream: ({ params }) => this.load(params.mode, params.date, params.filter),
  });

  /** Tâches de toute la période affichée (tous membres : la sélection des personnes se fait dans la liste). */
  protected readonly periodEntries = rxResource<AgendaEntryDTO[], { mode: Mode; date: Date }>({
    params: () => ({ mode: this.mode(), date: this.date() }),
    stream: ({ params }) => {
      const [from, to] = this.periodBounds(params.mode, params.date);
      return this.agendaApi.listAgenda(toIsoDate(from), toIsoDate(to)) as Observable<
        AgendaEntryDTO[]
      >;
    },
  });

  protected readonly weekStart = computed(() => startOfWeek(this.date()));
  protected readonly weekEnd = computed(() => addDays(this.weekStart(), 6));
  protected readonly today = new Date();

  // ---------- chargement : uniquement via les services générés

  private load(mode: Mode, date: Date, filter: MemberFilter): Observable<AgendaData> {
    const membreId = filter === 'all' ? undefined : filter;
    switch (mode) {
      case 'day':
        return this.agendaApi
          .getAgendaJour(toIsoDate(date), membreId)
          .pipe(map((entries) => ({ kind: 'day', entries })));
      case 'week':
        return this.agendaApi
          .getAgendaSemaine(toIsoDate(date), membreId)
          .pipe(map((entries) => ({ kind: 'week', entries })));
      case 'month':
        return this.agendaApi
          .getAgendaMois(date.getFullYear(), date.getMonth() + 1, membreId)
          .pipe(map((byDay) => ({ kind: 'month', byDay })));
      case 'year':
        return this.agendaApi
          .getAgendaAnnee(date.getFullYear(), membreId)
          .pipe(map((summary) => ({ kind: 'year', summary })));
    }
  }

  /** Premier et dernier jour (inclus) de la période affichée. */
  private periodBounds(mode: Mode, date: Date): [Date, Date] {
    switch (mode) {
      case 'day':
        return [date, date];
      case 'week': {
        const start = startOfWeek(date);
        return [start, addDays(start, 6)];
      }
      case 'month':
        return [
          new Date(date.getFullYear(), date.getMonth(), 1),
          new Date(date.getFullYear(), date.getMonth() + 1, 0),
        ];
      case 'year':
        return [new Date(date.getFullYear(), 0, 1), new Date(date.getFullYear(), 11, 31)];
    }
  }

  private reloadAll(): void {
    this.data.reload();
    this.periodEntries.reload();
  }

  // ---------- navigation

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
  }

  /** Avance (+1) ou recule (-1) d'un jour, d'une semaine, d'un mois ou d'une année selon le mode actif. */
  protected step(direction: 1 | -1): void {
    const d = this.date();
    switch (this.mode()) {
      case 'day':
        return this.date.set(addDays(d, direction));
      case 'week':
        return this.date.set(addDays(d, 7 * direction));
      case 'month':
        return this.date.set(addMonths(d, direction));
      case 'year':
        return this.date.set(addMonths(d, 12 * direction));
    }
  }

  protected goToToday(): void {
    this.date.set(startOfDay(new Date()));
  }

  protected showDay(day: Date): void {
    this.date.set(day);
    this.mode.set('day');
  }

  protected showMonth(month: number): void {
    this.date.set(new Date(this.date().getFullYear(), month - 1, 1));
    this.mode.set('month');
  }

  protected onMemberChange(value: MemberFilter | undefined): void {
    this.memberFilter.set(value ?? 'all');
  }

  // ---------- dialogues

  protected newReminder(): void {
    const day = this.mode() === 'year' ? this.today : this.date();
    this.openReminderDialog({ members: this.members.value() ?? [], defaultDate: day });
  }

  protected openEntry(entry: AgendaEntryDTO): void {
    this.dialog
      .open<EntryDialog, { entry: AgendaEntryDTO }, EntryDialogResult>(EntryDialog, {
        data: { entry },
        width: '520px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === 'saved') {
          this.reloadAll();
        } else if (result === 'edit-reminder') {
          this.editReminder(entry.reminderId!);
        } else if (result === 'delete-reminder') {
          this.deleteReminder(entry);
        }
      });
  }

  private editReminder(reminderId: number): void {
    this.remindersApi.getReminder(reminderId).subscribe({
      next: (reminder) =>
        this.openReminderDialog({ members: this.members.value() ?? [], reminder }),
      error: () => this.reloadAll(), // message déjà affiché par l'intercepteur ; le rappel a peut-être disparu
    });
  }

  private deleteReminder(entry: AgendaEntryDTO): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: $localize`:@@reminder.deleteTitle:Supprimer le rappel ?`,
          message: $localize`:@@reminder.deleteMessage:« ${entry.titre}:title: » sera supprimé ainsi que toutes ses occurrences à venir. Les occurrences passées restent dans l'agenda.`,
          confirmLabel: $localize`:@@common.delete:Supprimer`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.remindersApi.deleteReminder(entry.reminderId!).subscribe({
            next: () => this.notifications.success($localize`:@@reminder.deleted:Rappel supprimé.`),
            // Succès ou échec (ex. déjà supprimé ailleurs) : on rafraîchit l'agenda. L'erreur est affichée par l'intercepteur.
            error: () => this.reloadAll(),
            complete: () => this.reloadAll(),
          });
        }
      });
  }

  private openReminderDialog(data: ReminderDialogData): void {
    this.dialog
      .open<ReminderDialog, ReminderDialogData, boolean>(ReminderDialog, {
        data,
        width: '640px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadAll();
        }
      });
  }
}
