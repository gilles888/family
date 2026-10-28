import { Injectable, signal } from '@angular/core';
import { ThemeId } from './seasons';

/**
 * Thème affiché en ce moment, en lecture seule pour les composants légers (ex. Avatar) qui ne doivent pas dépendre du
 * service de thème complet (HTTP, authentification). SeasonThemeService le tient à jour.
 */
@Injectable({ providedIn: 'root' })
export class ActiveTheme {
  readonly id = signal<ThemeId>('neutre');
}
