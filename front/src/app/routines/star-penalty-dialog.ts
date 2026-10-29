import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EtoilesService } from '../api-client';
import { NotificationService } from '../shared/notification.service';
import { PENALTY_REASON_LABELS, PenaltyReason } from './routine-labels';

export interface StarPenaltyDialogData {
  memberId: number;
  memberName: string;
}

/** Retrait d'étoiles par un parent : nombre, motif (liste) et commentaire (obligatoire pour « Autre »). Se ferme avec `true` si enregistré. */
@Component({
  selector: 'app-star-penalty-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title i18n="@@penalty.title">Retirer des étoiles à {{ data.memberName }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()" id="star-penalty-form">
      <mat-dialog-content class="content">
        <mat-form-field>
          <mat-label i18n="@@penalty.count">Nombre d'étoiles</mat-label>
          <input matInput type="number" inputmode="numeric" formControlName="nombre" min="1" max="50" required />
          @if (form.controls.nombre.invalid) {
            <mat-error i18n="@@penalty.countInvalid">Entre 1 et 50.</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label i18n="@@penalty.reason">Motif</mat-label>
          <mat-select formControlName="motif" required>
            @for (r of reasons; track r) {
              <mat-option [value]="r">{{ labels[r] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field>
          <mat-label i18n="@@penalty.comment">Commentaire</mat-label>
          <textarea matInput formControlName="commentaire" rows="2" maxlength="255" [required]="commentRequired()"></textarea>
          @if (commentRequired()) {
            <mat-hint i18n="@@penalty.commentRequired">Obligatoire pour le motif « Autre ».</mat-hint>
          }
          @if (form.controls.commentaire.hasError('required')) {
            <mat-error i18n="@@penalty.commentMissing">Explique pourquoi.</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" matButton mat-dialog-close i18n="@@common.cancel">Annuler</button>
        <button type="submit" matButton="filled" [disabled]="saving()" i18n="@@penalty.submit">Retirer</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
    }
  `,
})
export class StarPenaltyDialog {
  private readonly api = inject(EtoilesService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<StarPenaltyDialog, boolean>);
  protected readonly data = inject<StarPenaltyDialogData>(MAT_DIALOG_DATA);

  protected readonly reasons = Object.keys(PENALTY_REASON_LABELS) as PenaltyReason[];
  protected readonly labels = PENALTY_REASON_LABELS;
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    nombre: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(50)] }),
    motif: new FormControl<PenaltyReason | null>(null, Validators.required),
    commentaire: new FormControl('', { nonNullable: true, validators: Validators.maxLength(255) }),
  });

  private readonly motif = toSignal(this.form.controls.motif.valueChanges, { initialValue: null });
  protected readonly commentRequired = () => this.motif() === 'AUTRE';

  constructor() {
    // Le commentaire devient obligatoire avec le motif « Autre »
    this.form.controls.motif.valueChanges.pipe(takeUntilDestroyed()).subscribe((motif) => {
      const comment = this.form.controls.commentaire;
      comment.setValidators(motif === 'AUTRE' ? [Validators.required, Validators.maxLength(255)] : Validators.maxLength(255));
      comment.updateValueAndValidity();
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, motif, commentaire } = this.form.getRawValue();
    this.saving.set(true);
    this.api.retirerEtoiles(this.data.memberId, { nombre, motif: motif!, commentaire: commentaire.trim() || undefined }).subscribe({
      next: () => {
        this.notifications.success($localize`:@@penalty.done:Étoiles retirées.`);
        this.dialogRef.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
