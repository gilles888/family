import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';
import { FamilyMemberDTO, RoutineDTO, RoutineRequest, RoutinesService } from '../api-client';
import { WEEKDAY_REFERENCE_DATES, WEEK_DAYS, WeekDay } from '../shared/labels';
import { RoutineIllustration } from './routine-icon';
import { ROUTINE_ICONS } from './routine-icons';
import { ROUTINE_PASTELS, ROUTINE_THEME_LABELS, ROUTINE_TYPE_LABELS, RoutineTheme, RoutineType, hhmm } from './routine-labels';

export interface RoutineEditorData {
  member: FamilyMemberDTO;
  /** Absente = nouvelle routine. */
  routine?: RoutineDTO;
}

type StepForm = FormGroup<{
  id: FormControl<number | null>;
  libelle: FormControl<string>;
  icone: FormControl<string>;
  couleur: FormControl<string>;
}>;

/** Début et fin : les deux ou aucune, et la fin après le début (mêmes règles que le serveur). */
function timeRange(group: AbstractControl): ValidationErrors | null {
  const { heureDebut, heureFin } = group.value as { heureDebut: string; heureFin: string };
  if (!heureDebut && !heureFin) {
    return null;
  }
  if (!heureDebut || !heureFin) {
    return { timeIncomplete: true };
  }
  return heureFin > heureDebut ? null : { timeOrder: true };
}

/**
 * Mode parent : création / modification d'une routine. Étapes : ajout, suppression, libellé, illustration (grille),
 * couleur, et réordonnancement par glisser-déposer (poignée ⋮⋮, souris et doigt) ou flèches (clavier).
 * Se ferme avec la routine enregistrée.
 */
@Component({
  selector: 'app-routine-editor-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
    RoutineIllustration,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-editor-dialog.html',
  styleUrl: './routine-editor-dialog.scss',
})
export class RoutineEditorDialog {
  private readonly api = inject(RoutinesService);
  private readonly dialogRef = inject(MatDialogRef<RoutineEditorDialog, RoutineDTO>);
  protected readonly data = inject<RoutineEditorData>(MAT_DIALOG_DATA);

  protected readonly types = Object.keys(ROUTINE_TYPE_LABELS) as RoutineType[];
  protected readonly typeLabels = ROUTINE_TYPE_LABELS;
  protected readonly themes = Object.keys(ROUTINE_THEME_LABELS) as RoutineTheme[];
  protected readonly themeLabels = ROUTINE_THEME_LABELS;
  protected readonly weekDays = WEEK_DAYS.map((code) => ({ code, reference: WEEKDAY_REFERENCE_DATES[code] }));
  protected readonly icons = ROUTINE_ICONS;
  protected readonly pastels = ROUTINE_PASTELS;
  protected readonly saving = signal(false);

  private readonly routine = this.data.routine;

  protected readonly form = new FormGroup(
    {
      nom: new FormControl(this.routine?.nom ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
      sousTitre: new FormControl(this.routine?.sousTitre ?? '', { nonNullable: true, validators: Validators.maxLength(150) }),
      type: new FormControl<RoutineType>(this.routine?.type ?? 'CUSTOM', { nonNullable: true }),
      theme: new FormControl<RoutineTheme>(this.routine?.theme ?? 'DAY', { nonNullable: true }),
      jours: new FormControl<WeekDay[]>(this.routine?.jours ?? [...WEEK_DAYS], { nonNullable: true }),
      heureDebut: new FormControl(hhmm(this.routine?.heureDebut), { nonNullable: true }),
      heureFin: new FormControl(hhmm(this.routine?.heureFin), { nonNullable: true }),
      active: new FormControl(this.routine?.active ?? true, { nonNullable: true }),
      etapes: new FormArray<StepForm>((this.routine?.etapes ?? []).map((s) => this.stepForm(s.id ?? null, s.libelle ?? '', s.icone ?? 'finish', s.couleur ?? ROUTINE_PASTELS[0]))),
    },
    { validators: timeRange },
  );

  protected get steps(): FormArray<StepForm> {
    return this.form.controls.etapes;
  }

  private stepForm(id: number | null, libelle: string, icone: string, couleur: string): StepForm {
    return new FormGroup({
      id: new FormControl<number | null>(id),
      libelle: new FormControl(libelle, { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
      icone: new FormControl(icone, { nonNullable: true }),
      couleur: new FormControl(couleur, { nonNullable: true }),
    });
  }

  protected addStep(): void {
    const index = this.steps.length;
    this.steps.push(this.stepForm(null, '', 'finish', ROUTINE_PASTELS[index % ROUTINE_PASTELS.length]));
  }

  protected removeStep(index: number): void {
    this.steps.removeAt(index);
  }

  protected moveStep(from: number, to: number): void {
    if (to < 0 || to >= this.steps.length || from === to) {
      return;
    }
    const step = this.steps.at(from);
    this.steps.removeAt(from, { emitEvent: false });
    this.steps.insert(to, step);
  }

  protected dropStep(event: CdkDragDrop<unknown>): void {
    this.moveStep(event.previousIndex, event.currentIndex);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: RoutineRequest = {
      membreId: this.data.member.id,
      nom: v.nom.trim(),
      sousTitre: v.sousTitre.trim() || undefined,
      type: v.type,
      theme: v.theme,
      jours: v.jours,
      heureDebut: v.heureDebut || undefined,
      heureFin: v.heureFin || undefined,
      active: v.active,
      etapes: v.etapes.map((s) => ({ id: s.id ?? undefined, libelle: s.libelle.trim(), icone: s.icone, couleur: s.couleur })),
    };
    const call: Observable<RoutineDTO> = this.routine ? this.api.updateRoutine(this.routine.id!, request) : this.api.createRoutine(request);
    this.saving.set(true);
    call.subscribe({
      next: (saved) => this.dialogRef.close(saved),
      error: () => this.saving.set(false), // message affiché par l'intercepteur
    });
  }
}
