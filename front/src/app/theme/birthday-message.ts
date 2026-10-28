import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Avatar } from '../avatar/avatar';
import { ThemeActif } from './season-theme.service';
import { ageAnniversaire } from './seasons';

/**
 * Message d'anniversaire avec l'avatar des membres fêtés.
 * En approche : compte à rebours en « dodos ». Le jour J : « Joyeux anniversaire » si c'est le membre connecté,
 * sinon une formule neutre (le genre n'est pas connu, donc pas d'accord il / elle).
 */
@Component({
  selector: 'app-birthday-message',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="avatars">
      @for (m of membres(); track m.id) {
        <app-avatar [member]="m" [size]="36" label="" />
      }
    </span>
    <span class="text">
      @if (theme().phase === 'approche') {
        <ng-container i18n="@@season.birthday.soon">{restants(), plural,
          =1 {Plus que 1 dodo avant l'anniversaire de {{ noms() }} !}
          other {Plus que {{ restants() }} dodos avant l'anniversaire de {{ noms() }} !}}</ng-container>
      } @else if (moi() && !plusieurs()) {
        <ng-container i18n="@@season.birthday.me">{age(), plural,
          =1 {Joyeux anniversaire {{ noms() }} ! Tu as 1 an aujourd'hui 🎉}
          other {Joyeux anniversaire {{ noms() }} ! Tu as {{ age() }} ans aujourd'hui 🎉}}</ng-container>
      } @else if (!plusieurs()) {
        <ng-container i18n="@@season.birthday.one">{age(), plural,
          =1 {C'est l'anniversaire de {{ noms() }} aujourd'hui : 1 an ! 🎂}
          other {C'est l'anniversaire de {{ noms() }} aujourd'hui : {{ age() }} ans ! 🎂}}</ng-container>
      } @else {
        <ng-container i18n="@@season.birthday.many">Joyeux anniversaire {{ noms() }} ! 🎉</ng-container>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .avatars {
      display: inline-flex;
      gap: 4px;
    }
    .text {
      font: var(--mat-sys-title-small);
    }
  `,
})
export class BirthdayMessage {
  readonly theme = input.required<ThemeActif>();

  private readonly auth = inject(AuthService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly membres = computed(() => this.theme().membres ?? []);
  protected readonly plusieurs = computed(() => this.membres().length > 1);
  protected readonly restants = computed(() => this.theme().joursRestants ?? 0);
  protected readonly moi = computed(() => {
    const membreId = this.auth.user()?.membreId;
    return membreId != null && this.membres().some((m) => m.id === membreId);
  });
  protected readonly noms = computed(() =>
    new Intl.ListFormat(this.locale, { style: 'long', type: 'conjunction' }).format(this.membres().map((m) => m.nom ?? '')),
  );
  protected readonly age = computed(() => {
    const naissance = this.membres()[0]?.dateNaissance;
    return naissance ? ageAnniversaire(naissance, new Date().getFullYear()) : 0;
  });
}
