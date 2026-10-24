import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { AccountDTO, ComptesService, FamilyMemberDTO } from '../api-client';
import { PASSWORD_MIN_LENGTH } from '../auth/password-rules';
import { NotificationService } from '../shared/notification.service';
import { ACCOUNT_ROLE_LABELS, AccountRole, generatePassword } from './account-labels';

export interface AccountDialogData {
  members: FamilyMemberDTO[];
  /** Absent : création. */
  account?: AccountDTO;
}

/** Un compte enfant doit être lié à un membre (celui dont il coche les routines). */
function childNeedsMember(group: AbstractControl): ValidationErrors | null {
  const { role, membreId } = group.value as { role: AccountRole; membreId: number | null };
  return role === 'ENFANT' && membreId == null ? { memberRequired: true } : null;
}

/** Création (identifiant, rôle, membre, mot de passe initial facultatif) ou modification (rôle, membre). */
@Component({
  selector: 'app-account-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-dialog.html',
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class AccountDialog {
  private readonly api = inject(ComptesService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<AccountDialog, boolean>);
  protected readonly data = inject<AccountDialogData>(MAT_DIALOG_DATA);

  protected readonly roles = Object.keys(ACCOUNT_ROLE_LABELS) as AccountRole[];
  protected readonly roleLabels = ACCOUNT_ROLE_LABELS;
  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup(
    {
      identifiant: new FormControl(this.data.account?.identifiant ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9._-]{2,49}$/)],
      }),
      role: new FormControl<AccountRole>(this.data.account?.role ?? 'ENFANT', { nonNullable: true }),
      membreId: new FormControl<number | null>(this.data.account?.membreId ?? null),
      motDePasse: new FormControl('', { nonNullable: true, validators: [Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(128)] }),
    },
    { validators: childNeedsMember },
  );

  constructor() {
    if (this.data.account) {
      this.form.controls.identifiant.disable();
    }
  }

  protected generate(): void {
    this.form.controls.motDePasse.setValue(generatePassword());
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { identifiant, role, membreId, motDePasse } = this.form.getRawValue();
    const request: Observable<AccountDTO> = this.data.account
      ? this.api.updateCompte(this.data.account.id!, { role, membreId: membreId ?? undefined, actif: this.data.account.actif! })
      : this.api.createCompte({ identifiant: identifiant.trim(), role, membreId: membreId ?? undefined, motDePasse: motDePasse || undefined });
    this.saving.set(true);
    request.subscribe({
      next: (account) => {
        this.notifications.success(
          this.data.account
            ? $localize`:@@accounts.saved:Compte « ${account.identifiant}:name: » enregistré.`
            : $localize`:@@accounts.created:Compte « ${account.identifiant}:name: » créé.`,
        );
        this.dialogRef.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
