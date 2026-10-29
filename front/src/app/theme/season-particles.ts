import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { isHexColor, darken, lighten } from '../shared/svg/shapes';
import { SeasonThemeService, ThemeActif } from './season-theme.service';
import { SeasonId } from './seasons';

type Animation = 'flocons' | 'feuilles' | 'confettis' | 'bulles';

/** Animation de fond de chaque thème, en phase « jour J » (8 éléments, assez grands pour être reconnus). */
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

const NB_ELEMENTS = 8;
export const CONFETTIS = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043'];
export const PAR_DEFAUT = '#e91e63';

/** Couleurs des membres fêtés (ballons, guirlande, confettis), avec leurs variantes claires et foncées. */
export function celebrationColors(theme: ThemeActif): string[] {
  const bases = (theme.membres ?? []).map((m) => (isHexColor(m.couleur) ? m.couleur : PAR_DEFAUT));
  const base = bases.length ? bases : [PAR_DEFAUT];
  return [...base, ...base.map((c) => lighten(c, 0.35)), ...base.map((c) => darken(c, 0.2))];
}

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
    taille: 18 + ((i * 5) % 13),
    derive: ((i % 5) - 2) * 18,
    couleur: couleurs ? couleurs[i % couleurs.length] : null,
  }));
}

/**
 * Quand une page (la chambre) montre les particules dans sa propre scène, le décor de page n'affiche pas les siennes.
 * La page appelle `hostParticles()` à sa création et `release()` à sa destruction.
 */
@Injectable({ providedIn: 'root' })
export class ParticlesScope {
  private readonly hosts = signal(0);
  readonly contained = computed(() => this.hosts() > 0);
  hostParticles(): () => void {
    this.hosts.update((n) => n + 1);
    return () => this.hosts.update((n) => n - 1);
  }
}

/**
 * Particules du thème (flocons, feuilles, confettis, bulles). Occupent tout leur parent positionné et y restent
 * (overflow masqué) : en page, le décor les place en plein écran ; dans la chambre, elles restent dans la scène.
 */
@Component({
  selector: 'app-season-particles',
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
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      container-type: size;
    }
    .fond {
      position: absolute;
      inset: 0;
    }
    .element {
      position: absolute;
      top: 0;
      opacity: 0.8;
      animation: chute linear infinite;
      will-change: transform;
    }
    // flocons et feuilles : de vrais pictogrammes (la taille vient de la largeur de l'élément)
    .flocons .element,
    .feuilles .element {
      display: grid;
      place-items: center;
      font-size: 0;
      container-type: size;
      &::before {
        font-size: 80cqh;
        line-height: 1;
      }
    }
    .flocons .element::before {
      content: '❄';
      color: color-mix(in srgb, var(--mat-sys-primary) 30%, white);
      text-shadow: 0 0 3px rgb(80 110 160 / 0.6);
    }
    .feuilles .element::before {
      content: '🍂';
    }
    .feuilles .element:nth-child(even)::before {
      content: '🍁';
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
        transform: translate3d(0, -12cqh, 0) rotate(0);
      }
      to {
        transform: translate3d(var(--derive), 112cqh, 0) rotate(240deg);
      }
    }
    @keyframes chute-tourne {
      from {
        transform: translate3d(0, -12cqh, 0) rotateX(0) rotate(0);
      }
      to {
        transform: translate3d(var(--derive), 112cqh, 0) rotateX(540deg) rotate(120deg);
      }
    }
    @keyframes montee {
      from {
        transform: translate3d(0, 108cqh, 0);
      }
      to {
        transform: translate3d(var(--derive), -12cqh, 0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .fond {
        display: none;
      }
    }
  `,
})
export class SeasonParticles {
  private readonly theme = inject(SeasonThemeService).actif;

  protected readonly animation = computed<Animation | null>(() => {
    const t = this.theme();
    return t.phase === 'jourJ' && t.id !== 'neutre' ? ANIMATIONS[t.id] : null;
  });

  protected readonly fond = computed(() => {
    const id = this.theme().id;
    return elements(
      id === 'anniversaire'
        ? [...celebrationColors(this.theme()), ...CONFETTIS]
        : id === 'carnaval' || id === 'rentree'
          ? CONFETTIS
          : null,
    );
  });
}
