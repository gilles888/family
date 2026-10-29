import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { seasonLabel } from './season-labels';
import { SeasonPicto } from './season-picto';
import { SeasonId, ThemeId } from './seasons';

/** Une vignette : un thème, ou « automatique » (suivre la date). */
export type ThemeChoice = ThemeId | 'auto';

/** Grille de vignettes (pictogramme + aperçu des couleurs). Survol et focus = aperçu, clic = sélection. */
@Component({
  selector: 'app-theme-grid',
  imports: [SeasonPicto, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grille" role="group" [attr.aria-label]="label()">
      @for (choix of choices(); track choix) {
        <button
          type="button"
          class="vignette"
          [class.choisie]="selected() === choix"
          [attr.aria-pressed]="selected() === choix"
          (click)="select.emit(choix)"
          (mouseenter)="preview.emit(choix)"
          (focus)="preview.emit(choix)"
          (mouseleave)="preview.emit(null)"
          (blur)="preview.emit(null)"
        >
          @if (choix === 'auto') {
            <mat-icon class="auto">autorenew</mat-icon>
          } @else if (choix === 'neutre') {
            <mat-icon class="auto">palette</mat-icon>
          } @else {
            <app-season-picto [id]="seasonId(choix)" [size]="40" />
          }
          @if (choix !== 'auto') {
            <span class="couleurs" [attr.data-season-preview]="choix" aria-hidden="true">
              <span class="primaire"></span><span class="tertiaire"></span
              ><span class="fond"></span>
            </span>
          }
          <span class="nom">{{ nom(choix) }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .grille {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
      gap: 8px;
    }
    .vignette {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 6px 8px;
      border: 2px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-label-large);
      cursor: pointer;
    }
    .vignette:hover,
    .vignette:focus-visible {
      border-color: var(--mat-sys-primary);
    }
    .vignette.choisie {
      border-color: var(--mat-sys-primary);
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .auto {
      width: 40px;
      height: 40px;
      font-size: 36px;
    }
    .couleurs {
      display: flex;
      width: 64px;
      height: 14px;
      overflow: hidden;
      border-radius: 7px;
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .couleurs span {
      flex: 1;
    }
    .primaire {
      background: var(--mat-sys-primary);
    }
    .tertiaire {
      background: var(--mat-sys-tertiary);
    }
    .fond {
      background: var(--mat-sys-primary-container);
    }
    .nom {
      text-align: center;
    }
  `,
})
export class ThemeGrid {
  readonly choices = input.required<ThemeChoice[]>();
  readonly selected = input<ThemeChoice | null>(null);
  readonly label = input('');
  readonly select = output<ThemeChoice>();
  /** Thème survolé ou ciblé au clavier ; null = plus rien. */
  readonly preview = output<ThemeChoice | null>();

  protected seasonId(choix: ThemeChoice): SeasonId {
    return choix as SeasonId;
  }

  protected nom(choix: ThemeChoice): string {
    return choix === 'auto' ? $localize`:@@theme.auto:Automatique` : seasonLabel(choix);
  }
}
