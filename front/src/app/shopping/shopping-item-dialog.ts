import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ShoppingItemDTO } from '../api-client';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { INGREDIENT_UNITS } from '../shared/labels';
import { shoppingItemForm, toRequest } from './shopping-item-form';
import { ShoppingStore } from './shopping-store';

/** Modification d'un article : nom, quantité, unité. Se ferme avec `true` si enregistré. */
@Component({
  selector: 'app-shopping-item-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, EnumLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title i18n="@@shopping.editTitle">Modifier l'article</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="content">
        <mat-form-field>
          <mat-label i18n="@@shopping.name">Article</mat-label>
          <input matInput formControlName="nom" maxlength="100" required />
          @if (form.controls.nom.invalid) {
            <mat-error i18n="@@shopping.nameRequired">Nom obligatoire.</mat-error>
          }
        </mat-form-field>
        <div class="row">
          <mat-form-field>
            <mat-label i18n="@@shopping.quantity">Quantité</mat-label>
            <input matInput type="number" min="0" step="any" formControlName="quantite" />
            @if (form.controls.quantite.invalid) {
              <mat-error i18n="@@shopping.quantityInvalid">Quantité positive.</mat-error>
            }
          </mat-form-field>
          <mat-form-field>
            <mat-label i18n="@@shopping.unit">Unité</mat-label>
            <mat-select formControlName="unite">
              <mat-option [value]="null">—</mat-option>
              @for (u of units; track u) {
                <mat-option [value]="u">{{ u | enumLabel: 'unit' }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        @if (form.hasError('unitWithoutQuantity')) {
          <p class="error" i18n="@@shopping.unitWithoutQuantity">Indiquez une quantité pour cette unité.</p>
        }
        @if (item.origine === 'GENERE') {
          <p class="hint" i18n="@@shopping.editGeneratedHint">
            Cet article vient des repas : la quantité saisie sera gardée lors des prochaines générations.
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" matButton mat-dialog-close i18n="@@common.cancel">Annuler</button>
        <button type="submit" matButton="filled" [disabled]="saving()" i18n="@@common.save">Enregistrer</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .hint,
    .error {
      margin: 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class ShoppingItemDialog {
  private readonly store = inject(ShoppingStore);
  private readonly dialogRef = inject(MatDialogRef<ShoppingItemDialog, boolean>);
  protected readonly item = inject<ShoppingItemDTO>(MAT_DIALOG_DATA);

  protected readonly units = INGREDIENT_UNITS;
  protected readonly form = shoppingItemForm({
    nom: this.item.nom,
    quantite: this.item.quantite ?? undefined,
    unite: this.item.unite ?? undefined,
  });
  protected readonly saving = signal(false);

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    // En cas d'erreur, le message est affiché par l'intercepteur ; le dialogue reste ouvert
    this.store.update(this.item.id!, toRequest(this.form)).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.saving.set(false),
    });
  }
}
