import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BirthdayMessage } from './birthday-message';
import { SeasonPicto } from './season-picto';
import { SeasonThemeService } from './season-theme.service';
import { seasonGreeting } from './season-labels';
import { SeasonId } from './seasons';

/** Message du jour en haut du tableau de bord (phase « jour J » seulement) : souhait de la fête, ou anniversaire. */
@Component({
  selector: 'app-season-message',
  imports: [BirthdayMessage, SeasonPicto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = theme();
    @if (t.id === 'anniversaire' && t.membres?.length) {
      <p class="message"><app-birthday-message [theme]="t" /></p>
    } @else if (id(); as saison) {
      <p class="message">
        <app-season-picto [id]="saison" [size]="36" />
        <span class="text">{{ greeting() }}</span>
      </p>
    }
  `,
  styles: `
    .message {
      display: flex;
      align-items: center;
      gap: 10px;
      box-sizing: border-box;
      width: 100%;
      max-width: 640px;
      margin: 0 auto;
      padding: 10px 14px;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .text {
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class SeasonMessage {
  protected readonly theme = inject(SeasonThemeService).actif;
  /** Thème à fêter : seulement en phase jour J. */
  protected readonly id = computed<SeasonId | null>(() => {
    const t = this.theme();
    return t.phase === 'jourJ' && t.id !== 'neutre' ? t.id : null;
  });
  protected readonly greeting = computed(() => (this.id() ? seasonGreeting(this.id()!) : ''));
}
