import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpContext } from '@angular/common/http';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { IngredientDTO, IngredientsService, RecettesService, RecipeDTO, RecipeRequest } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { INGREDIENT_UNITS, IngredientUnit } from '../shared/labels';
import { NotificationService } from '../shared/notification.service';
import { duplicateIngredientNames } from './ingredient-names';

export interface RecipeDialogData {
  /** Présent = mode édition. */
  recipe?: RecipeDTO;
}

const SUGGESTIONS = 8;

/** Création / édition d'une recette type et de sa liste d'ingrédients (autocomplétion, création à la volée). */
@Component({
  selector: 'app-recipe-dialog',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EnumLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-dialog.html',
  styleUrl: './recipe-dialog.scss',
})
export class RecipeDialog {
  private readonly data = inject<RecipeDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<RecipeDialog, RecipeDTO>>(MatDialogRef);
  private readonly recettesApi = inject(RecettesService);
  private readonly ingredientsApi = inject(IngredientsService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly editing = this.data.recipe;
  protected readonly units = INGREDIENT_UNITS;
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(500)],
    portions: [4, [Validators.required, Validators.min(1), Validators.max(100)]],
    tempsPreparation: [null as number | null, [Validators.min(1), Validators.max(1440)]],
    instructions: ['', Validators.maxLength(10000)],
    ingredients: this.fb.array([] as ReturnType<RecipeDialog['ingredientRow']>[], (a) => this.noDuplicates(a)),
  });

  /** Texte saisi dans la ligne d'ingrédient active : une seule liste de suggestions, partagée par les lignes. */
  private readonly query = signal('');
  protected readonly suggestions = toSignal(
    toObservable(this.query).pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) =>
        this.ingredientsApi
          .searchIngredients(q.trim(), SUGGESTIONS, 'body', false, {
            context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
          })
          .pipe(catchError(() => of([] as IngredientDTO[]))),
      ),
    ),
    { initialValue: [] as IngredientDTO[] },
  );

  constructor() {
    const recipe = this.data.recipe;
    if (recipe) {
      this.form.patchValue({
        nom: recipe.nom ?? '',
        description: recipe.description ?? '',
        portions: recipe.portions ?? 4,
        tempsPreparation: recipe.tempsPreparation ?? null,
        instructions: recipe.instructions ?? '',
      });
      for (const line of recipe.ingredients ?? []) {
        this.ingredients.push(this.ingredientRow(line.nom ?? '', line.quantite ?? null, line.unite ?? 'G'));
      }
    } else {
      this.addIngredient();
    }
  }

  protected get ingredients(): FormArray<ReturnType<RecipeDialog['ingredientRow']>> {
    return this.form.controls.ingredients;
  }

  private ingredientRow(nom = '', quantite: number | null = null, unite: IngredientUnit = 'G') {
    return this.fb.group({
      nom: [nom, [Validators.required, Validators.maxLength(100)]],
      quantite: [quantite, [Validators.required, Validators.min(0.001), Validators.max(9_999_999)]],
      unite: [unite, Validators.required],
    });
  }

  protected addIngredient(): void {
    this.ingredients.push(this.ingredientRow());
  }

  protected removeIngredient(index: number): void {
    this.ingredients.removeAt(index);
  }

  protected searchIngredients(text: string): void {
    this.query.set(text);
  }

  private noDuplicates(array: AbstractControl): ValidationErrors | null {
    const names = (array.value as { nom: string }[]).map((row) => row.nom ?? '');
    const duplicates = duplicateIngredientNames(names);
    return duplicates.length ? { duplicates } : null;
  }

  protected duplicates(): string {
    return (this.ingredients.errors?.['duplicates'] as string[] | undefined)?.join(', ') ?? '';
  }

  private toRequest(): RecipeRequest {
    const v = this.form.getRawValue();
    return {
      nom: v.nom.trim(),
      description: v.description.trim() || undefined,
      portions: v.portions,
      tempsPreparation: v.tempsPreparation ?? undefined,
      instructions: v.instructions.trim() || undefined,
      ingredients: v.ingredients.map((row) => ({ nom: row.nom.trim(), quantite: row.quantite!, unite: row.unite })),
    };
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const request = this.toRequest();
    const call = this.editing
      ? this.recettesApi.updateRecette(this.editing.id!, request)
      : this.recettesApi.createRecette(request);
    call.subscribe({
      next: (recipe) => {
        this.notifications.success(
          this.editing
            ? $localize`:@@recipe.updated:Recette modifiée.`
            : $localize`:@@recipe.created:Recette créée.`,
        );
        this.ref.close(recipe);
      },
      error: () => this.saving.set(false), // message affiché par l'intercepteur
    });
  }
}
