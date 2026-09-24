import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { MealDTO, MealRequest, RecettesService, RecipeSummaryDTO, RepasService } from '../api-client';
import { SKIP_ERROR_NOTIFICATION, apiErrorMessage } from '../shared/api-error.interceptor';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { parseIsoDate, toIsoDate } from '../shared/date-utils';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { MEAL_SLOTS, MealSlot } from '../shared/labels';
import { NotificationService } from '../shared/notification.service';

export interface MealDialogData {
  /** Présent = mode édition. */
  meal?: MealDTO;
  /** Création : jour et créneau de la case cliquée. */
  date?: Date;
  slot?: MealSlot;
  /** Création : portions proposées (ex. nombre de membres de la famille). */
  defaultPortions?: number;
}

export type MealDialogResult = 'saved' | 'deleted';

type Kind = 'recipe' | 'label';
type RecipeValue = RecipeSummaryDTO | string | null;

/** Libellés libres proposés en un clic. */
const QUICK_LABELS = [$localize`:@@meal.quick.leftovers:Restes`, $localize`:@@meal.quick.restaurant:Resto`];

/** Ajout / modification d'un repas : une recette type (recherche) OU un libellé libre. */
@Component({
  selector: 'app-meal-dialog',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EnumLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meal-dialog.html',
  styleUrl: './meal-dialog.scss',
})
export class MealDialog {
  private readonly data = inject<MealDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<MealDialog, MealDialogResult>>(MatDialogRef);
  private readonly dialog = inject(MatDialog);
  private readonly repasApi = inject(RepasService);
  private readonly recettesApi = inject(RecettesService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly editing = this.data.meal;
  protected readonly slots = MEAL_SLOTS;
  protected readonly quickLabels = QUICK_LABELS;
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    date: [null as Date | null, Validators.required],
    creneau: ['SOUPER' as MealSlot, Validators.required],
    portions: [4, [Validators.required, Validators.min(1), Validators.max(50)]],
    kind: ['recipe' as Kind],
    recette: [null as RecipeValue, (c: AbstractControl) => this.recipeSelected(c)],
    libelle: ['', [Validators.maxLength(100), (c: AbstractControl) => this.labelFilled(c)]],
  });

  protected readonly kind = toSignal(this.form.controls.kind.valueChanges, { initialValue: this.form.controls.kind.value });

  /**
   * Texte saisi dans la recherche de recette. Avec `requireSelection`, le contrôle ne reçoit que la recette
   * choisie (jamais le texte tapé) : la recherche suit donc l'événement `input` du champ.
   */
  protected readonly recipeQuery = signal('');

  /** Recettes proposées selon le texte saisi (toutes si vide). */
  protected readonly recipes = toSignal(
    toObservable(this.recipeQuery).pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) =>
        this.recettesApi
          .listRecettes(q.trim() || undefined, 'body', false, { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) })
          .pipe(catchError(() => of([] as RecipeSummaryDTO[]))),
      ),
    ),
    { initialValue: [] as RecipeSummaryDTO[] },
  );

  constructor() {
    const { meal, date, slot, defaultPortions } = this.data;
    if (meal) {
      this.form.patchValue({
        date: parseIsoDate(meal.date!),
        creneau: meal.creneau!,
        portions: meal.portions ?? 4,
        kind: meal.recetteId ? 'recipe' : 'label',
        recette: meal.recetteId ? { id: meal.recetteId, nom: meal.titre } : null,
        libelle: meal.libelle ?? '',
      });
    } else {
      this.form.patchValue({ date: date ?? new Date(), creneau: slot ?? 'SOUPER', portions: defaultPortions ?? 4 });
    }
    // Les validateurs de recette et de libellé dépendent du type choisi
    this.form.controls.kind.valueChanges.subscribe(() => {
      this.form.controls.recette.updateValueAndValidity();
      this.form.controls.libelle.updateValueAndValidity();
    });
  }

  protected readonly displayRecipe = (value: RecipeValue): string =>
    typeof value === 'string' ? value : (value?.nom ?? '');

  private recipeSelected(c: AbstractControl): ValidationErrors | null {
    if (this.form?.controls.kind.value !== 'recipe') {
      return null;
    }
    const v = c.value as RecipeValue;
    return v && typeof v === 'object' && v.id ? null : { recipeRequired: true };
  }

  private labelFilled(c: AbstractControl): ValidationErrors | null {
    return this.form?.controls.kind.value === 'label' && !(c.value as string).trim() ? { required: true } : null;
  }

  protected useQuickLabel(label: string): void {
    this.form.controls.libelle.setValue(label);
  }

  private toRequest(): MealRequest {
    const v = this.form.getRawValue();
    const recette = v.recette as RecipeSummaryDTO | null;
    return {
      date: toIsoDate(v.date!),
      creneau: v.creneau,
      portions: v.portions,
      recetteId: v.kind === 'recipe' ? recette!.id : undefined,
      libelle: v.kind === 'label' ? v.libelle.trim() : undefined,
    };
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const request = this.toRequest();
    // Erreurs affichées ici : un 409 a une explication précise dans ce contexte (créneau déjà pris)
    const options = { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) };
    const call = this.editing
      ? this.repasApi.updateRepas(this.editing.id!, request, 'body', false, options)
      : this.repasApi.createRepas(request, 'body', false, options);
    call.subscribe({
      next: () => {
        this.notifications.success(
          this.editing ? $localize`:@@meal.updated:Repas modifié.` : $localize`:@@meal.created:Repas ajouté.`,
        );
        this.ref.close('saved');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notifications.error(
          error.status === 409
            ? $localize`:@@meal.slotTaken:Un repas est déjà prévu à ce créneau. Choisissez un autre jour ou créneau.`
            : apiErrorMessage(error),
        );
      },
    });
  }

  protected remove(): void {
    const meal = this.editing!;
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: $localize`:@@meal.deleteTitle:Supprimer ce repas ?`,
          message: $localize`:@@meal.deleteMessage:« ${meal.titre}:title: » sera retiré du planning.`,
          confirmLabel: $localize`:@@common.delete:Supprimer`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.saving.set(true);
          this.repasApi.deleteRepas(meal.id!).subscribe({
            next: () => {
              this.notifications.success($localize`:@@meal.deleted:Repas supprimé.`);
              this.ref.close('deleted');
            },
            error: () => this.saving.set(false),
          });
        }
      });
  }
}
