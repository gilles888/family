import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NotificationService } from '../shared/notification.service';
import { AuthService } from './auth.service';
import { PASSWORD_MIN_LENGTH } from './password-rules';

function sameAsNew(group: AbstractControl): ValidationErrors | null {
  const { nouveau, confirmation } = group.value as { nouveau: string; confirmation: string };
  return confirmation && nouveau !== confirmation ? { mismatch: true } : null;
}

/**
 * Changement de son mot de passe. Quand le backend l'exige (premier mot de passe donné par un parent ou par
 * famille.json), c'est la seule page accessible : la navigation est masquée et les gardes y ramènent.
 */
@Component({
  selector: 'app-password-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-page.html',
  styleUrl: './auth-pages.scss',
})
export class PasswordPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly form = new FormGroup(
    {
      ancien: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      nouveau: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(128)] }),
      confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: sameAsNew },
  );
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const { ancien, nouveau } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.auth.changePassword(ancien, nouveau).subscribe({
      next: () => {
        this.notifications.success($localize`:@@password.changed:Mot de passe changé.`);
        void this.router.navigateByUrl('/');
      },
      error: (e: unknown) => {
        this.submitting.set(false);
        this.error.set(
          e instanceof HttpErrorResponse && e.status === 400
            ? $localize`:@@password.error.invalid:Mot de passe actuel incorrect, ou nouveau mot de passe identique à l'actuel.`
            : $localize`:@@password.error.unknown:Le mot de passe n'a pas pu être changé. Réessayez.`,
        );
      },
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe({ complete: () => void this.router.navigateByUrl('/connexion'), error: () => void this.router.navigateByUrl('/connexion') });
  }
}
