import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { FamilyMemberDTO, ReminderDTO, ReminderRequest, RemindersService } from '../api-client';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { NotificationService } from '../shared/notification.service';
import { combine, parseIsoDate, parseIsoDateTime, toIsoDate, toIsoDateTime } from '../shared/date-utils';
import { FREQUENCIES, Frequency, REMINDER_TYPES, ReminderType, WEEKDAY_REFERENCE_DATES, WEEK_DAYS, WeekDay } from '../shared/labels';

export interface ReminderDialogData {
  members: FamilyMemberDTO[];
  /** Présent = mode édition. */
  reminder?: ReminderDTO;
  /** Jour proposé par défaut en création. */
  defaultDate?: Date;
}

type EndMode = 'never' | 'date' | 'count';

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Création / édition d'un Reminder, avec sous-formulaire de récurrence. */
@Component({
  selector: 'app-reminder-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTimepickerModule,
    EnumLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reminder-dialog.html',
  styleUrl: './reminder-dialog.scss',
})
export class ReminderDialog {
  private readonly data = inject<ReminderDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ReminderDialog, boolean>>(MatDialogRef);
  private readonly remindersApi = inject(RemindersService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly editing = this.data.reminder;
  protected readonly members = this.data.members;
  protected readonly types = REMINDER_TYPES;
  protected readonly frequencies = FREQUENCIES;
  protected readonly weekDays = WEEK_DAYS.map((code) => ({ code, reference: WEEKDAY_REFERENCE_DATES[code] }));
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    titre: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(2000)],
    type: ['SPORT' as ReminderType, Validators.required],
    membreIds: [[] as number[]],
    date: [null as Date | null, Validators.required],
    startTime: [null as Date | null, Validators.required],
    endTime: [null as Date | null, (c: AbstractControl) => this.endAfterStart(c)],
    recurring: [false],
    recurrence: this.fb.group({
      frequence: ['WEEKLY' as Frequency],
      intervalle: [1, [Validators.required, Validators.min(1), Validators.max(365)]],
      joursSemaine: [[] as WeekDay[]],
      endMode: ['never' as EndMode],
      dateFin: [null as Date | null],
      nombreOccurrences: [10 as number | null],
    }),
  });

  protected readonly recurring = toSignal(this.form.controls.recurring.valueChanges, { initialValue: this.form.controls.recurring.value });
  protected readonly frequence = toSignal(this.form.controls.recurrence.controls.frequence.valueChanges, {
    initialValue: this.form.controls.recurrence.controls.frequence.value,
  });
  protected readonly endMode = toSignal(this.form.controls.recurrence.controls.endMode.valueChanges, {
    initialValue: this.form.controls.recurrence.controls.endMode.value,
  });

  constructor() {
    const { reminder, defaultDate } = this.data;
    if (reminder) {
      this.fillFrom(reminder);
    } else {
      this.form.controls.date.setValue(defaultDate ?? new Date());
      this.form.controls.startTime.setValue(new Date(2000, 0, 1, 9, 0));
    }

    const rec = this.form.controls.recurrence.controls;
    // La fin de récurrence n'est validée que selon le mode choisi
    rec.endMode.valueChanges.subscribe(() => this.updateEndValidators());
    this.updateEndValidators();
    // Les validations croisées se recalculent quand l'autre champ change
    this.form.controls.startTime.valueChanges.subscribe(() => this.form.controls.endTime.updateValueAndValidity());
    this.form.controls.date.valueChanges.subscribe(() => rec.dateFin.updateValueAndValidity());
  }

  // ---------- validations

  private endAfterStart(end: AbstractControl): ValidationErrors | null {
    const start = end.parent?.get('startTime')?.value as Date | null | undefined;
    const endValue = end.value as Date | null;
    return start && endValue && minutesOf(endValue) < minutesOf(start) ? { endBeforeStart: true } : null;
  }

  private updateEndValidators(): void {
    const rec = this.form.controls.recurrence.controls;
    const mode = rec.endMode.value;
    rec.dateFin.setValidators(mode === 'date' ? [Validators.required, (c) => this.endDateNotBeforeStart(c)] : []);
    rec.nombreOccurrences.setValidators(mode === 'count' ? [Validators.required, Validators.min(1)] : []);
    rec.dateFin.updateValueAndValidity();
    rec.nombreOccurrences.updateValueAndValidity();
  }

  private endDateNotBeforeStart(c: AbstractControl): ValidationErrors | null {
    const start = this.form?.controls.date.value;
    const end = c.value as Date | null;
    return start && end && end < new Date(start.getFullYear(), start.getMonth(), start.getDate()) ? { endBeforeStart: true } : null;
  }

  // ---------- édition : DTO -> formulaire

  private fillFrom(r: ReminderDTO): void {
    const start = parseIsoDateTime(r.dateHeureDebut!);
    this.form.patchValue({
      titre: r.titre ?? '',
      description: r.description ?? '',
      type: r.type as ReminderType,
      membreIds: (r.membres ?? []).map((m) => m.id!),
      date: start,
      startTime: start,
      endTime: r.dateHeureFin ? parseIsoDateTime(r.dateHeureFin) : null,
      recurring: r.isRecurring ?? false,
    });
    const rule = r.recurrence;
    if (rule) {
      this.form.controls.recurrence.patchValue({
        frequence: rule.frequence as Frequency,
        intervalle: rule.intervalle ?? 1,
        joursSemaine: (rule.joursSemaine ?? []) as WeekDay[],
        endMode: rule.dateFin ? 'date' : rule.nombreOccurrences ? 'count' : 'never',
        dateFin: rule.dateFin ? parseIsoDate(rule.dateFin) : null,
        nombreOccurrences: rule.nombreOccurrences ?? 10,
      });
    }
  }

  // ---------- envoi : formulaire -> ReminderRequest généré

  private toRequest(): ReminderRequest {
    const v = this.form.getRawValue();
    const start = combine(v.date!, v.startTime!);
    const rec = v.recurrence;
    return {
      titre: v.titre.trim(),
      description: v.description.trim() || undefined,
      type: v.type,
      dateHeureDebut: toIsoDateTime(start),
      dateHeureFin: v.endTime ? toIsoDateTime(combine(v.date!, v.endTime)) : undefined,
      membreIds: v.membreIds,
      isRecurring: v.recurring,
      recurrence: v.recurring
        ? {
            frequence: rec.frequence,
            intervalle: rec.intervalle,
            joursSemaine: rec.frequence === 'WEEKLY' && rec.joursSemaine.length ? rec.joursSemaine : undefined,
            dateFin: rec.endMode === 'date' && rec.dateFin ? toIsoDate(rec.dateFin) : undefined,
            nombreOccurrences: rec.endMode === 'count' && rec.nombreOccurrences ? rec.nombreOccurrences : undefined,
          }
        : undefined,
    };
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const request = this.toRequest();
    const call = this.editing ? this.remindersApi.updateReminder(this.editing.id!, request) : this.remindersApi.createReminder(request);
    call.subscribe({
      next: (result) => {
        const count = result.agenda?.nombre ?? 0;
        this.notifications.success(
          this.editing
            ? $localize`:@@reminder.updated:Rappel modifié. Entrées dans l'agenda : ${count}:count:`
            : $localize`:@@reminder.created:Rappel créé. Entrées ajoutées à l'agenda : ${count}:count:`,
        );
        this.ref.close(true);
      },
      error: () => this.saving.set(false), // message affiché par l'intercepteur
    });
  }
}
