import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SeasonThemeService } from './season-theme.service';
import { SEASON_IDS, ThemeId } from './seasons';
import { ThemeChoice, ThemeGrid } from './theme-grid';

/** « Mon thème » : choix du thème de cet appareil (enfant si la famille l'autorise, ou parent). */
@Component({
  selector: 'app-device-theme-dialog',
  imports: [MatButtonModule, MatDialogModule, ThemeGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title i18n="@@theme.device.title">Mon thème</h2>
    <mat-dialog-content>
      <p class="info" i18n="@@theme.device.hint">Ce choix ne vaut que pour cet appareil.</p>
      <app-theme-grid
        [choices]="choix"
        [selected]="choisi()"
        label="Mon thème"
        i18n-label="@@theme.device.title"
        (select)="choisi.set($event)"
        (preview)="survol.set($event)"
      />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close i18n="@@common.cancel">Annuler</button>
      <button matButton="filled" type="button" (click)="save()" i18n="@@common.save">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .info {
      margin: 0 0 12px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class DeviceThemeDialog {
  private readonly service = inject(SeasonThemeService);
  private readonly ref = inject<MatDialogRef<DeviceThemeDialog, boolean>>(MatDialogRef);

  /** Pas de thème « anniversaire » ici : il dépend d'un membre. */
  protected readonly choix: ThemeChoice[] = [
    'auto',
    'neutre',
    ...SEASON_IDS.filter((id) => id !== 'anniversaire'),
  ];
  protected readonly choisi = signal<ThemeChoice>(this.service.preferenceAppareil() ?? 'auto');
  protected readonly survol = signal<ThemeChoice | null>(null);
  private readonly cible = computed(() => this.survol() ?? this.choisi());

  constructor() {
    effect(() => {
      this.service.previsualiser(this.cible());
    });
    inject(DestroyRef).onDestroy(() => this.service.previsualiser(null));
  }

  protected save(): void {
    const choisi = this.choisi();
    this.service.choisirPourAppareil(choisi === 'auto' ? null : (choisi as ThemeId));
    this.ref.close(true);
  }
}
