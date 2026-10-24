import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AccountDTO, ComptesService } from '../api-client';
import { PASSWORD_MIN_LENGTH } from '../auth/password-rules';
import { NotificationService } from '../shared/notification.service';
import { generatePassword } from './account-labels';

export interface PasswordResetDialogData {
  account: AccountDTO;
}

/**
 * Nouveau mot de passe défini par un parent (affiché en clair, pour le transmettre) : à changer à la prochaine
 * connexion. Les sessions et « rester connecté » du compte sont révoqués ; un compte sans mot de passe devient actif.
 */
@Component({
  selector: 'app-password-reset-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title i18n="@@accounts.resetTitle">Mot de passe de {{ data.account.identifiant }}</h2>
    <mat-dialog-content>
      <p i18n="@@accounts.resetIntro">Il devra être changé à la prochaine connexion. Les appareils connectés à ce compte sont déconnectés.</p>
      <mat-form-field class="field">
        <mat-label i18n="@@password.new">Nouveau mot de passe</mat-label>
        <input matInput [formControl]="password" autocomplete="new-password" spellcheck="false" required />
        <button type="button" matIconSuffix matIconButton (click)="generate()" i18n-aria-label="@@accounts.generate" aria-label="Générer">
          <mat-icon>casino</mat-icon>
        </button>
        @if (password.hasError('minlength')) {
          <mat-error i18n="@@password.tooShort">{{ minLength }} caractères minimum.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close i18n="@@common.cancel">Annuler</button>
      <button matButton="filled" [disabled]="password.invalid || saving()" (click)="save()" i18n="@@common.save">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .field {
      width: 100%;
    }
  `,
})
export class PasswordResetDialog {
  private readonly api = inject(ComptesService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<PasswordResetDialog, boolean>);
  protected readonly data = inject<PasswordResetDialogData>(MAT_DIALOG_DATA);

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly password = new FormControl(generatePassword(), {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(128)],
  });
  protected readonly saving = signal(false);

  protected generate(): void {
    this.password.setValue(generatePassword());
  }

  protected save(): void {
    this.saving.set(true);
    this.api.resetMotDePasseCompte(this.data.account.id!, { motDePasse: this.password.value }).subscribe({
      next: () => {
        this.notifications.success($localize`:@@accounts.passwordSet:Mot de passe de « ${this.data.account.identifiant}:name: » défini.`);
        this.dialogRef.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
