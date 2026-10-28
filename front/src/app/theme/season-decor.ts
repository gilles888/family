import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { isHexColor, darken, lighten } from '../shared/svg/shapes';
import { BirthdayMessage } from './birthday-message';
import { SeasonThemeService } from './season-theme.service';
import { SeasonId } from './seasons';

type Animation = 'flocons' | 'feuilles' | 'confettis' | 'bulles';

/** Animation de fond de chaque thème, en phase « jour J » (15 éléments au plus). */
const ANIMATIONS: Record<SeasonId, Animation> = {
  halloween: 'feuilles',
  'saint-nicolas': 'flocons',
  noel: 'flocons',
  hiver: 'flocons',
  automne: 'feuilles',
  printemps: 'feuilles',
  carnaval: 'confettis',
  rentree: 'confettis',
  anniversaire: 'confettis',
  paques: 'bulles',
  ete: 'bulles',
};

const NB_ELEMENTS = 15;
const CONFETTIS = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043'];
const PAR_DEFAUT = '#e91e63';

interface Element {
  gauche: number;
  delai: number;
  duree: number;
  taille: number;
  derive: number;
  couleur: string | null;
}

/** Valeurs réparties de façon déterministe (pas d'aléatoire : même rendu à chaque affichage). */
function elements(couleurs: string[] | null): Element[] {
  return Array.from({ length: NB_ELEMENTS }, (_, i) => ({
    gauche: (i * 37 + 5) % 100,
    delai: -((i * 1.7) % 11),
    duree: 9 + ((i * 5) % 7),
    taille: 8 + ((i * 3) % 9),
    derive: ((i % 5) - 2) * 18,
    couleur: couleurs ? couleurs[i % couleurs.length] : null,
  }));
}

/**
 * Décors de fond : animation légère du thème (phase « jour J »), et pour un anniversaire, bandeau du membre fêté, plus,
 * le jour J, guirlande et ballons à sa couleur. Tout est derrière le contenu, ne capte aucun clic, et s'efface sur mobile
 * et si l'utilisateur préfère moins d'animations.
 */
@Component({
  selector: 'app-season-decor',
  imports: [BirthdayMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (animation(); as type) {
      <div class="fond" [class]="type" aria-hidden="true">
        @for (e of fond(); track $index) {
          <span
            class="element"
            [style.left.%]="e.gauche"
            [style.width.px]="e.taille"
            [style.height.px]="e.taille"
            [style.animation-delay.s]="e.delai"
            [style.animation-duration.s]="e.duree"
            [style.--derive.px]="e.derive"
            [style.--couleur]="e.couleur"
          ></span>
        }
      </div>
    }

    @if (fete(); as t) {
      @if (t.phase === 'jourJ') {
        <svg class="guirlande" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 6 Q150 44 300 6 Q450 44 600 6" fill="none" stroke="#8d6e63" stroke-width="2" />
          @for (f of fanions; track $index) {
            <path [attr.d]="f.d" [attr.fill]="couleurs()[$index % couleurs().length]" />
          }
        </svg>
        @for (cote of cotes; track cote) {
          <svg class="ballons" [class]="'ballons ' + cote" viewBox="0 0 120 200" aria-hidden="true">
            @for (b of ballonsDessin; track $index) {
              <path [attr.d]="'M' + b.x + ' ' + (b.y + 44) + ' Q' + (b.x + 4) + ' 150 60 190'" fill="none" stroke="#9e9e9e" stroke-width="1.5" />
              <ellipse [attr.cx]="b.x" [attr.cy]="b.y" rx="26" ry="32" [attr.fill]="couleurs()[$index % couleurs().length]" />
              <ellipse [attr.cx]="b.x - 9" [attr.cy]="b.y - 12" rx="6" ry="10" fill="#fff" opacity="0.35" />
              <path [attr.d]="'M' + (b.x - 5) + ' ' + (b.y + 34) + ' L' + b.x + ' ' + (b.y + 28) + ' L' + (b.x + 5) + ' ' + (b.y + 34) + 'Z'" [attr.fill]="couleurs()[$index % couleurs().length]" />
            }
          </svg>
        }
      }
      <div class="bandeau" role="status"><app-birthday-message [theme]="t" /></div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    // Derrière le contenu, au-dessus du fond de page
    .fond,
    .guirlande,
    .ballons {
      position: fixed;
      pointer-events: none;
      z-index: -1;
    }
    .fond {
      inset: 0;
      overflow: hidden;
    }
    .element {
      position: absolute;
      top: 0;
      opacity: 0.55;
      animation: chute linear infinite;
      will-change: transform;
    }
    .flocons .element {
      border-radius: 50%;
      background: color-mix(in srgb, var(--mat-sys-primary) 35%, white);
    }
    .feuilles .element {
      border-radius: 0 100% 0 100%;
      background: color-mix(in srgb, var(--mat-sys-primary) 55%, transparent);
    }
    .feuilles .element:nth-child(even) {
      background: color-mix(in srgb, var(--mat-sys-tertiary) 55%, transparent);
    }
    .confettis .element {
      height: 0.9em;
      border-radius: 2px;
      background: var(--couleur, var(--mat-sys-primary));
      animation-name: chute-tourne;
    }
    .bulles .element {
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--mat-sys-primary) 45%, transparent);
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
      animation-name: montee;
    }
    @keyframes chute {
      from {
        transform: translate3d(0, -12vh, 0) rotate(0);
      }
      to {
        transform: translate3d(var(--derive), 112vh, 0) rotate(240deg);
      }
    }
    @keyframes chute-tourne {
      from {
        transform: translate3d(0, -12vh, 0) rotateX(0) rotate(0);
      }
      to {
        transform: translate3d(var(--derive), 112vh, 0) rotateX(540deg) rotate(120deg);
      }
    }
    @keyframes montee {
      from {
        transform: translate3d(0, 108vh, 0);
      }
      to {
        transform: translate3d(var(--derive), -12vh, 0);
      }
    }

    .guirlande {
      top: 64px;
      left: 0;
      width: 100%;
      height: 40px;
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
      display: flex;
      justify-content: center;
      padding: 6px 16px;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }

    @media (prefers-reduced-motion: reduce) {
      .fond {
        display: none;
      }
      .ballons {
        animation: none;
      }
    }
    // Téléphone : pas de décor animé, le pictogramme et le bandeau suffisent
    @media (max-width: 599.98px) {
      .fond,
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

  protected readonly animation = computed<Animation | null>(() => {
    const t = this.theme();
    return t.phase === 'jourJ' && t.id !== 'neutre' ? ANIMATIONS[t.id] : null;
  });

  /** Couleurs des membres fêtés (ballons, guirlande, confettis), avec leurs variantes claires et foncées. */
  protected readonly couleurs = computed(() => {
    const bases = (this.theme().membres ?? []).map((m) => (isHexColor(m.couleur) ? m.couleur : PAR_DEFAUT));
    const base = bases.length ? bases : [PAR_DEFAUT];
    return [...base, ...base.map((c) => lighten(c, 0.35)), ...base.map((c) => darken(c, 0.2))];
  });

  protected readonly fond = computed(() => elements(this.theme().id === 'anniversaire' ? [...this.couleurs(), ...CONFETTIS] : this.theme().id === 'carnaval' || this.theme().id === 'rentree' ? CONFETTIS : null));

  /** Fanions de la guirlande, répartis le long de la courbe (triangles pointe en bas). */
  protected readonly fanions = Array.from({ length: 13 }, (_, i) => {
    const x = 25 + i * 45;
    // hauteur de la corde (courbe de Bézier) approchée par une parabole par arche
    const t = ((x % 300) / 300) * 2 - 1;
    const y = 6 + 19 * (1 - t * t) * 1;
    return { d: `M${x - 9} ${y.toFixed(1)} L${x + 9} ${y.toFixed(1)} L${x} ${(y + 18).toFixed(1)}Z` };
  });

  protected readonly cotes = ['gauche', 'droite'];

  protected readonly ballonsDessin = [
    { x: 34, y: 62 },
    { x: 72, y: 42 },
    { x: 54, y: 100 },
  ];
}
