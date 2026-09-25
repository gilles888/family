import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, signal } from '@angular/core';
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
  MealDTO,
  MembresService,
  RemindersService,
  RepasService,
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
import { MealDisplayMode, MealDisplayPreference } from '../meals/meal-display';
import { byDateTime, mealEntry, mealOf } from '../meals/meal-entries';
import { MealDialog, MealDialogData, MealDialogResult } from '../meals/meal-dialog';
import { MealSlotRequest } from '../meals/meals-week-card';
import { RecipeSheetDialog, RecipeSheetDialogData, RecipeSheetResult } from '../recipes/recipe-sheet-dialog';
import { AgendaCardsContext } from '../dashboard/agenda-cards-context';
import { MobilePageComponent } from '../dashboard/mobile-page';
import { MobilePanelService } from '../dashboard/mobile-panel.service';
import { Avatar } from '../avatar/avatar';

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
    MobilePageComponent,
    Avatar,
  ],
  // Les cartes de la page Mobile lisent les données de l'agenda et lui délèguent les dialogues
  providers: [{ provide: AgendaCardsContext, useExisting: forwardRef(() => AgendaPage) }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-page.html',
  styleUrl: './agenda-page.scss',
})
export class AgendaPage implements AgendaCardsContext {
  private readonly agendaApi = inject(AgendaService);
  private readonly remindersApi = inject(RemindersService);
  private readonly membresApi = inject(MembresService);
  private readonly repasApi = inject(RepasService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  protected readonly mealDisplay = inject(MealDisplayPreference);
  private readonly mobilePanel = inject(MobilePanelService);

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

  /** Mode « repas dans l'agenda » : repas de la période affichée (pas en vue Année), sauf s'ils sont masqués. */
  protected readonly agendaMeals = rxResource<MealDTO[], { from: string; to: string } | undefined>({
    params: () => {
      if (this.mealDisplay.mode() !== 'agenda' || !this.mealDisplay.visibleInAgenda() || this.mode() === 'year') {
        return undefined;
      }
      const [from, to] = this.periodBounds(this.mode(), this.date());
      return { from: toIsoDate(from), to: toIsoDate(to) };
    },
    stream: ({ params }) => this.repasApi.listRepas(params.from, params.to),
  });

  /** Données du calendrier, avec les repas ajoutés comme des entrées (🍽️) quand ils sont affichés dans l'agenda. */
  protected readonly calendar = computed<AgendaData | undefined>(() => {
    if (!this.data.hasValue()) {
      return undefined;
    }
    const data = this.data.value();
    const meals = this.agendaMeals.hasValue() ? this.agendaMeals.value().map(mealEntry) : [];
    if (meals.length === 0) {
      return data;
    }
    switch (data.kind) {
      case 'day':
      case 'week':
        return { ...data, entries: [...data.entries, ...meals].sort(byDateTime) };
      case 'month': {
        const byDay = { ...data.byDay };
        for (const meal of meals) {
          const day = meal.dateHeure!.substring(0, 10);
          byDay[day] = [...(byDay[day] ?? []), meal].sort(byDateTime);
        }
        return { ...data, byDay };
      }
      case 'year':
        return data;
    }
  });

  // ---------- données partagées avec les cartes (AgendaCardsContext)

  readonly tasks = computed(() => (this.periodEntries.hasValue() ? this.periodEntries.value() : []));
  readonly familyMembers = computed(() => (this.members.hasValue() ? this.members.value() : []));
  readonly mealsVersion = signal(0);

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

  /** « En carte » : la carte des repas est dans la page Mobile, qu'on ouvre sur elle. */
  protected setMealDisplay(mode: MealDisplayMode): void {
    this.mealDisplay.setMode(mode);
    if (mode === 'card') {
      this.mobilePanel.open('meals');
    }
  }

  protected onMemberChange(value: MemberFilter | undefined): void {
    this.memberFilter.set(value ?? 'all');
  }

  // ---------- dialogues

  protected newReminder(): void {
    const day = this.mode() === 'year' ? this.today : this.date();
    this.openReminderDialog({ members: this.members.value() ?? [], defaultDate: day });
  }

  openEntry(entry: AgendaEntryDTO): void {
    const meal = mealOf(entry);
    if (meal) {
      this.openMeal(meal);
      return;
    }
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

  // ---------- repas

  /** Portions proposées pour un nouveau repas : un par membre de la famille. */
  private defaultPortions(): number {
    return this.members.hasValue() && this.members.value().length > 0 ? this.members.value().length : 4;
  }

  /** Mode agenda : ajout depuis la barre d'outils, au jour affiché. */
  protected newMealForDay(): void {
    const day = this.mode() === 'year' ? this.today : this.date();
    this.openMealDialog({ date: day, defaultPortions: this.defaultPortions() });
  }

  newMeal(request: MealSlotRequest): void {
    this.openMealDialog({ date: request.date, slot: request.slot, defaultPortions: this.defaultPortions() });
  }

  /** Repas lié à une recette : fiche recette (quantités pour ses portions), d'où l'on peut le modifier. Sinon : modification. */
  openMeal(meal: MealDTO): void {
    if (!meal.recetteId) {
      this.openMealDialog({ meal });
      return;
    }
    this.dialog
      .open<RecipeSheetDialog, RecipeSheetDialogData, RecipeSheetResult>(RecipeSheetDialog, {
        data: { recipeId: meal.recetteId, portions: meal.portions, meal },
        width: '640px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((result) => result === 'edit-meal' && this.openMealDialog({ meal }));
  }

  private openMealDialog(data: MealDialogData): void {
    this.dialog
      .open<MealDialog, MealDialogData, MealDialogResult>(MealDialog, {
        data,
        width: '560px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((result) => result && this.reloadMeals());
  }

  private reloadMeals(): void {
    this.mealsVersion.update((v) => v + 1);
    this.agendaMeals.reload();
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
