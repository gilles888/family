import { ChangeDetectionStrategy, Component, DestroyRef, LOCALE_ID, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ThemeSettingsRequest } from '../api-client';
import { parseIsoDate, startOfDay, toIsoDate } from '../shared/date-utils';
import { NotificationService } from '../shared/notification.service';
import { seasonLabel, seasonPhaseLabel } from './season-labels';
import { SeasonThemeService } from './season-theme.service';
import { SEASON_IDS, SeasonId, toApiTheme, toSeasonId } from './seasons';
import { ThemeChoice, ThemeGrid } from './theme-grid';

type Mode = 'AUTO' | 'FORCE' | 'OFF';

/** Parent : thème de toute la famille (automatique, un thème choisi, ou désactivé), avec aperçu en direct. */
@Component({
  selector: 'app-family-theme-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ThemeGrid,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title i18n="@@theme.family.title">Thème de la famille</h2>
    <mat-dialog-content class="content">
      <p class="info" role="status">
        <ng-container i18n="@@theme.family.now">Thème du moment en automatique : {{ moment() }}</ng-container>
        @if (prochain(); as p) {
          —
          <ng-container i18n="@@theme.family.next">{p.jours, plural,
            =0 {prochain anniversaire : {{ p.noms }} aujourd'hui}
            =1 {prochain anniversaire : {{ p.noms }} demain}
            other {prochain anniversaire : {{ p.noms }} dans {{ p.jours }} jours}}</ng-container>
        }
      </p>

      <mat-radio-group class="modes" [ngModel]="mode()" (ngModelChange)="mode.set($event)" aria-label="Mode" i18n-aria-label="@@theme.family.mode">
        <mat-radio-button value="AUTO" i18n="@@theme.family.auto">Automatique</mat-radio-button>
        <mat-radio-button value="FORCE" i18n="@@theme.family.force">Thème choisi</mat-radio-button>
        <mat-radio-button value="OFF" i18n="@@theme.family.off">Désactivé</mat-radio-button>
      </mat-radio-group>

      @if (mode() === 'FORCE') {
        <app-theme-grid
          [choices]="choix"
          [selected]="theme()"
          label="Thème choisi"
          i18n-label="@@theme.family.force"
          (select)="choisir($event)"
          (preview)="survol.set($event)"
        />

        @if (theme() === 'anniversaire') {
          <mat-form-field>
            <mat-label i18n="@@theme.family.member">Membre fêté</mat-label>
            <mat-select [ngModel]="membreId()" (ngModelChange)="membreId.set($event)" required>
              @for (m of membres(); track m.id) {
                <mat-option [value]="m.id">{{ m.nom }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field>
          <mat-label i18n="@@theme.family.until">Jusqu'au (facultatif)</mat-label>
          <input matInput [matDatepicker]="finPicker" [min]="aujourdhui" [ngModel]="jusqua()" (ngModelChange)="jusqua.set($event)" />
          <mat-datepicker-toggle matIconSuffix [for]="finPicker" />
          <mat-datepicker #finPicker />
          <mat-hint i18n="@@theme.family.untilHint">Ensuite, retour automatique au thème de la date.</mat-hint>
        </mat-form-field>
      }

      <mat-checkbox [ngModel]="anniversairesActifs()" (ngModelChange)="anniversairesActifs.set($event)" i18n="@@theme.family.birthdays">
        Fêter les anniversaires automatiquement
      </mat-checkbox>
      <mat-checkbox [ngModel]="enfantsPeuventChoisir()" (ngModelChange)="enfantsPeuventChoisir.set($event)" i18n="@@theme.family.children">
        Les enfants peuvent choisir leur thème sur leur appareil
      </mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close i18n="@@common.cancel">Annuler</button>
      <button matButton="filled" type="button" [disabled]="!valide() || saving()" (click)="save()" i18n="@@common.save">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px !important;
    }
    .info {
      margin: 0;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .modes {
      display: flex;
      flex-wrap: wrap;
      column-gap: 8px;
    }
  `,
})
export class FamilyThemeDialog {
  private readonly service = inject(SeasonThemeService);
  private readonly ref = inject<MatDialogRef<FamilyThemeDialog, boolean>>(MatDialogRef);
  private readonly notifications = inject(NotificationService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly aujourdhui = startOfDay(new Date());
  protected readonly choix: ThemeChoice[] = [...SEASON_IDS];
  protected readonly membres = this.service.membres;
  protected readonly saving = signal(false);

  private readonly depart = this.service.reglage();
  protected readonly mode = signal<Mode>(this.depart?.mode ?? 'AUTO');
  protected readonly theme = signal<SeasonId | null>(this.depart?.theme ? toSeasonId(this.depart.theme) : null);
  protected readonly membreId = signal<number | null>(this.depart?.membreId ?? null);
  protected readonly jusqua = signal<Date | null>(this.depart?.jusqua ? parseIsoDate(this.depart.jusqua) : null);
  protected readonly anniversairesActifs = signal(this.depart?.anniversairesActifs ?? true);
  protected readonly enfantsPeuventChoisir = signal(this.depart?.enfantsPeuventChoisir ?? false);
  /** Vignette survolée (aperçu provisoire). */
  protected readonly survol = signal<ThemeChoice | null>(null);

  protected readonly valide = computed(
    () => this.mode() !== 'FORCE' || (this.theme() !== null && (this.theme() !== 'anniversaire' || this.membreId() !== null)),
  );

  protected readonly moment = computed(() => {
    const auto = this.service.automatique();
    return seasonLabel(auto.id) + (auto.phase ? ` (${seasonPhaseLabel(auto.phase)})` : '');
  });

  protected readonly prochain = computed(() => {
    const p = this.service.prochainAnniversaire();
    if (!p) {
      return null;
    }
    const noms = new Intl.ListFormat(this.locale, { style: 'long', type: 'conjunction' }).format(p.membres.map((m) => m.nom ?? ''));
    return { noms, jours: p.jours };
  });

  constructor() {
    // Aperçu en direct : la vignette survolée, sinon ce qui serait enregistré
    effect(() => {
      const survol = this.survol();
      const mode = this.mode();
      const cible: ThemeChoice | null = survol && mode === 'FORCE' ? survol : mode === 'OFF' ? 'neutre' : mode === 'FORCE' ? this.theme() : 'auto';
      const membre = this.membres().find((m) => m.id === this.membreId()) ?? this.membres().find((m) => m.dateNaissance) ?? this.membres()[0];
      this.service.previsualiser(cible ?? 'auto', membre);
    });
    // Fermer sans enregistrer annule l'aperçu
    inject(DestroyRef).onDestroy(() => this.service.previsualiser(null));
  }

  protected choisir(choix: ThemeChoice): void {
    if (choix !== 'auto' && choix !== 'neutre') {
      this.theme.set(choix);
    }
  }

  protected save(): void {
    this.saving.set(true);
    const force = this.mode() === 'FORCE';
    const request: ThemeSettingsRequest = {
      mode: this.mode(),
      theme: force ? (toApiTheme(this.theme()!) as ThemeSettingsRequest.ThemeEnum) : null,
      membreId: force && this.theme() === 'anniversaire' ? this.membreId() : null,
      jusqua: force && this.jusqua() ? toIsoDate(this.jusqua()!) : null,
      anniversairesActifs: this.anniversairesActifs(),
      enfantsPeuventChoisir: this.enfantsPeuventChoisir(),
    };
    this.service.enregistrerFamille(request).subscribe({
      next: () => {
        this.notifications.success($localize`:@@theme.family.saved:Thème enregistré.`);
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
