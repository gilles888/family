import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';
import { ACCOUNT_ROLE_LABELS } from './accounts/account-labels';
import { SeasonDecor } from './theme/season-decor';
import { SeasonPicto } from './theme/season-picto';
import { SeasonThemeService } from './theme/season-theme.service';
import { SeasonId } from './theme/seasons';

/** Langues proposées. Ajouter une langue : voir README ("Ajouter une nouvelle langue"). */
const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatButtonToggleModule, MatIconModule, MatMenuModule, MatToolbarModule, SeasonDecor, SeasonPicto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  protected readonly locale = inject(LOCALE_ID).substring(0, 2);
  protected readonly languages = LANGUAGES;
  protected readonly auth = inject(AuthService);
  /** Thème du moment (pictogramme à côté du titre) ; le service pose aussi data-season sur <html>. */
  protected readonly themes = inject(SeasonThemeService);
  private readonly theme = this.themes.actif;
  private readonly dialog = inject(MatDialog);
  protected readonly pictoId = computed(() => (this.theme().id === 'neutre' ? null : (this.theme().id as SeasonId)));
  protected readonly parentLabel = ACCOUNT_ROLE_LABELS.PARENT;
  protected readonly childLabel = ACCOUNT_ROLE_LABELS.ENFANT;

  constructor() {
    inject(Title).setTitle($localize`:@@app.title:Agenda familial`);
  }

  /**
   * Chaque langue est un build distinct (/fr/, /nl/) : changer de langue = recharger l'application
   * dans l'autre build, sur la même page.
   */
  protected switchLanguage(code: string): void {
    if (code === this.locale) {
      return;
    }
    const base = environment.localeUrls[code];
    if (base) {
      window.location.href = base + this.router.url.replace(/^\//, '');
    }
  }

  /** Dialogues de thème chargés à la demande (ils ne servent qu'une fois de temps en temps). */
  protected async openFamilyTheme(): Promise<void> {
    const { FamilyThemeDialog } = await import('./theme/family-theme-dialog');
    this.dialog.open(FamilyThemeDialog, { width: '640px', maxWidth: '95vw' });
  }

  protected async openDeviceTheme(): Promise<void> {
    const { DeviceThemeDialog } = await import('./theme/device-theme-dialog');
    this.dialog.open(DeviceThemeDialog, { width: '560px', maxWidth: '95vw' });
  }

  protected logout(): void {
    const toLogin = () => void this.router.navigateByUrl('/connexion');
    this.auth.logout().subscribe({ complete: toLogin, error: toLogin });
  }
}
