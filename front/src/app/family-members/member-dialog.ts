import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FamilyMemberDTO, MembresService } from '../api-client';
import { NotificationService } from '../shared/notification.service';

export interface MemberDialogData {
  /** Présent = édition. */
  member?: FamilyMemberDTO;
}

const PALETTE = ['#e91e63', '#2196f3', '#ff9800', '#4caf50', '#9c27b0', '#00bcd4', '#795548', '#f44336'];

@Component({
  selector: 'app-member-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      @if (member) {
        <ng-container i18n="@@member.editTitle">Modifier le membre</ng-container>
      } @else {
        <ng-container i18n="@@member.createTitle">Nouveau membre</ng-container>
      }
    </h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="content">
        <mat-form-field>
          <mat-label i18n="@@member.name">Nom</mat-label>
          <input matInput formControlName="nom" maxlength="100" required />
          @if (form.controls.nom.hasError('required')) {
            <mat-error i18n="@@form.required">Ce champ est obligatoire.</mat-error>
          }
        </mat-form-field>
        <label class="color">
          <span i18n="@@member.color">Couleur</span>
          <input type="color" formControlName="couleur" />
        </label>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close i18n="@@common.cancel">Annuler</button>
        <button matButton="filled" type="submit" [disabled]="saving()" i18n="@@common.save">Enregistrer</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px !important;
    }
    .color {
      display: flex;
      align-items: center;
      gap: 12px;
      input {
        width: 56px;
        height: 36px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
      }
    }
  `,
})
export class MemberDialog {
  protected readonly member = inject<MemberDialogData>(MAT_DIALOG_DATA).member;
  private readonly ref = inject<MatDialogRef<MemberDialog, boolean>>(MatDialogRef);
  private readonly api = inject(MembresService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly saving = signal(false);
  protected readonly form = this.fb.group({
    nom: [this.member?.nom ?? '', [Validators.required, Validators.maxLength(100)]],
    couleur: [this.member?.couleur ?? PALETTE[Math.floor(Math.random() * PALETTE.length)]],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const request = { nom: this.form.controls.nom.value.trim(), couleur: this.form.controls.couleur.value };
    const call = this.member ? this.api.updateMembre(this.member.id!, request) : this.api.createMembre(request);
    call.subscribe({
      next: () => {
        this.notifications.success($localize`:@@member.saved:Membre enregistré.`);
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
