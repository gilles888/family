import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BirthdayMessage } from './birthday-message';
import { SeasonThemeService } from './season-theme.service';
import { ParticlesScope, SeasonParticles, celebrationColors } from './season-particles';

/**
 * Décors de fond : animation légère du thème (phase « jour J »), et pour un anniversaire, bandeau du membre fêté, plus,
 * le jour J, guirlande et ballons à sa couleur. Tout est derrière le contenu, ne capte aucun clic, et s'efface sur mobile
 * et si l'utilisateur préfère moins d'animations.
 */
@Component({
  selector: 'app-season-decor',
  imports: [BirthdayMessage, SeasonParticles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!scope.contained()) {
      <app-season-particles />
    }

    @if (fete(); as t) {
      @if (t.phase === 'jourJ' && !scope.contained()) {
        @for (cote of cotes; track cote) {
          <svg class="ballons" [class]="'ballons ' + cote" viewBox="0 0 120 200" aria-hidden="true">
            @for (b of ballonsDessin; track $index) {
              <path
                [attr.d]="'M' + b.x + ' ' + (b.y + 44) + ' Q' + (b.x + 4) + ' 150 60 190'"
                fill="none"
                stroke="#9e9e9e"
                stroke-width="1.5"
              />
              <ellipse
                [attr.cx]="b.x"
                [attr.cy]="b.y"
                rx="26"
                ry="32"
                [attr.fill]="couleurs()[$index % couleurs().length]"
              />
              <ellipse
                [attr.cx]="b.x - 9"
                [attr.cy]="b.y - 12"
                rx="6"
                ry="10"
                fill="#fff"
                opacity="0.35"
              />
              <path
                [attr.d]="
                  'M' +
                  (b.x - 5) +
                  ' ' +
                  (b.y + 34) +
                  ' L' +
                  b.x +
                  ' ' +
                  (b.y + 28) +
                  ' L' +
                  (b.x + 5) +
                  ' ' +
                  (b.y + 34) +
                  'Z'
                "
                [attr.fill]="couleurs()[$index % couleurs().length]"
              />
            }
          </svg>
        }
      }
      <div class="bandeau" role="status">
        <app-birthday-message [theme]="t" />
        @if (t.phase === 'jourJ') {
          <svg class="guirlande" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M0 6 Q150 44 300 6 Q450 44 600 6"
              fill="none"
              stroke="#8d6e63"
              stroke-width="2"
            />
            @for (f of fanions; track $index) {
              <path [attr.d]="f.d" [attr.fill]="couleurs()[$index % couleurs().length]" />
            }
          </svg>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    // Derrière le contenu, au-dessus du fond de page
    app-season-particles,
    .ballons {
      position: fixed;
      pointer-events: none;
      z-index: -1;
    }

    // Sous le bandeau, derrière le contenu (le bandeau ne crée pas de contexte d'empilement)
    .guirlande {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      height: 40px;
      pointer-events: none;
      z-index: -1;
    }
    .ballons {
      bottom: 0;
      width: 110px;
      height: 190px;
      animation: flotte 5s ease-in-out infinite alternate;
    }
    .gauche {
      left: 6px;
    }
    .droite {
      right: 6px;
      animation-delay: -2.5s;
    }
    @keyframes flotte {
      to {
        transform: translateY(-10px);
      }
    }

    .bandeau {
      position: relative;
      display: flex;
      justify-content: center;
      padding: 6px 16px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    @media (prefers-reduced-motion: reduce) {
      .ballons {
        animation: none;
      }
    }
    // Téléphone : pas de décor animé, le pictogramme et le bandeau suffisent
    @media (max-width: 599.98px) {
      app-season-particles,
      .guirlande,
      .ballons {
        display: none;
      }
    }
  `,
})
export class SeasonDecor {
  private readonly theme = inject(SeasonThemeService).actif;

  /** Membres fêtés (thème anniversaire seulement). */
  protected readonly fete = computed(() => {
    const t = this.theme();
    return t.id === 'anniversaire' && t.membres?.length ? t : null;
  });

  protected readonly scope = inject(ParticlesScope);

  /** Couleurs des membres fêtés (ballons, guirlande), avec leurs variantes claires et foncées. */
  protected readonly couleurs = computed(() => celebrationColors(this.theme()));

  /** Fanions de la guirlande, répartis le long de la courbe (triangles pointe en bas). */
  protected readonly fanions = Array.from({ length: 13 }, (_, i) => {
    const x = 25 + i * 45;
    // hauteur de la corde (courbe de Bézier) approchée par une parabole par arche
    const t = ((x % 300) / 300) * 2 - 1;
    const y = 6 + 19 * (1 - t * t) * 1;
    return {
      d: `M${x - 9} ${y.toFixed(1)} L${x + 9} ${y.toFixed(1)} L${x} ${(y + 18).toFixed(1)}Z`,
    };
  });

  protected readonly cotes = ['gauche', 'droite'];

  protected readonly ballonsDessin = [
    { x: 34, y: 62 },
    { x: 72, y: 42 },
    { x: 54, y: 100 },
  ];
}
