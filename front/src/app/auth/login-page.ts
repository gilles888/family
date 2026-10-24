import { ChangeDetectionStrategy, Component, LOCALE_ID, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from './auth.service';
import { safeReturnUrl } from './auth.guards';

/** Message d'erreur de connexion, d'après le code renvoyé par le backend. */
export function loginErrorMessage(error: unknown, locale: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return $localize`:@@login.error.unknown:Connexion impossible. Réessayez.`;
  }
  if (error.status === 0) {
    return $localize`:@@error.network:Impossible de joindre le serveur. Vérifiez votre connexion.`;
  }
  switch (error.error?.code) {
    case 'COMPTE_BLOQUE': {
      const until: string | undefined = error.error?.bloqueJusqua;
      if (until) {
        const time = formatDate(until, 'shortTime', locale);
        return $localize`:@@login.error.locked:Trop de tentatives. Réessayez après ${time}:time:.`;
      }
      return $localize`:@@login.error.lockedNoTime:Trop de tentatives. Réessayez dans quelques minutes.`;
    }
    case 'COMPTE_DESACTIVE':
      return $localize`:@@login.error.disabled:Ce compte est désactivé. Demandez à un parent.`;
    case 'IDENTIFIANTS_INVALIDES':
      return $localize`:@@login.error.invalid:Identifiant ou mot de passe incorrect.`;
    default:
      return error.status === 403
        ? $localize`:@@login.error.expired:La page a expiré. Rechargez-la puis réessayez.`
        : $localize`:@@login.error.unknown:Connexion impossible. Réessayez.`;
  }
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './auth-pages.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly locale = inject(LOCALE_ID);

  protected readonly form = new FormGroup({
    identifiant: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    motDePasse: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    resterConnecte: new FormControl(false, { nonNullable: true }),
  });
  protected readonly hidePassword = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const { identifiant, motDePasse, resterConnecte } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(identifiant.trim(), motDePasse, resterConnecte).subscribe({
      next: (me) => {
        const retour = safeReturnUrl(this.route.snapshot.queryParamMap.get('retour'));
        void this.router.navigateByUrl(me.doitChangerMotDePasse ? '/mot-de-passe' : retour);
      },
      error: (e: unknown) => {
        this.submitting.set(false);
        this.error.set(loginErrorMessage(e, this.locale));
        this.form.controls.motDePasse.reset();
      },
    });
  }
}
