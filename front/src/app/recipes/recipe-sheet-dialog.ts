import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MealDTO, RecettesService, RecipeSheetDTO } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { EnumLabelPipe } from '../shared/enum-label.pipe';

export interface RecipeSheetDialogData {
  recipeId: number;
  /** Portions voulues (celles du repas) ; absent = portions de la recette. */
  portions?: number;
  /** Présent si la fiche est ouverte depuis un repas : propose de le modifier. */
  meal?: MealDTO;
}

/** Ce que la fiche demande à l'appelant une fois fermée. */
export type RecipeSheetResult = 'edit-meal';

const MIN_PORTIONS = 1;
const MAX_PORTIONS = 100;

/** Fiche recette : ingrédients recalculés au prorata des portions, temps, instructions. */
@Component({
  selector: 'app-recipe-sheet-dialog',
  imports: [DecimalPipe, MatButtonModule, MatDialogModule, MatIconModule, MatProgressBarModule, EnumLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-sheet-dialog.html',
  styleUrl: './recipe-sheet-dialog.scss',
})
export class RecipeSheetDialog {
  protected readonly data = inject<RecipeSheetDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(RecettesService);

  /** Undefined tant que la fiche n'a pas donné les portions de la recette (ouverture sans repas). */
  protected readonly portions = signal<number | undefined>(this.data.portions);

  /**
   * Les quantités sont recalculées par le backend à chaque changement de portions. Les paramètres sont un objet :
   * `undefined` voudrait dire « ne pas charger » pour une ressource, or c'est ici « portions de la recette ».
   */
  protected readonly sheet = rxResource<RecipeSheetDTO, { portions: number | undefined }>({
    params: () => ({ portions: this.portions() }),
    stream: ({ params: { portions } }) =>
      this.api.getFicheRecette(this.data.recipeId, portions, 'body', false, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      }),
  });

  protected readonly minPortions = MIN_PORTIONS;
  protected readonly maxPortions = MAX_PORTIONS;

  protected current(): number {
    return this.portions() ?? (this.sheet.hasValue() ? this.sheet.value().portions! : MIN_PORTIONS);
  }

  protected changePortions(delta: 1 | -1): void {
    this.portions.set(Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, this.current() + delta)));
  }

  /** La recette a été supprimée entre-temps (l'erreur HTTP est la `cause` de l'erreur de la ressource). */
  protected notFound(): boolean {
    const error: unknown = this.sheet.error();
    const http = error instanceof HttpErrorResponse ? error : (error as { cause?: unknown } | undefined)?.cause;
    return http instanceof HttpErrorResponse && http.status === 404;
  }

  /** Instructions découpées en étapes (une par ligne non vide). */
  protected steps(instructions: string | null | undefined): string[] {
    return (instructions ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
}
