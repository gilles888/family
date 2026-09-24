import { ChangeDetectionStrategy, Component, LOCALE_ID, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { environment } from '../environments/environment';

/** Langues proposées. Ajouter une langue : voir README ("Ajouter une nouvelle langue"). */
const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatButtonToggleModule, MatIconModule, MatToolbarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  protected readonly locale = inject(LOCALE_ID).substring(0, 2);
  protected readonly languages = LANGUAGES;

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
}
