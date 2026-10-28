import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { ExchangeDialog, ExchangeDialogData } from './exchange-dialog';
import { ShopService } from './shop.service';

/**
 * Tirelire : étoiles disponibles ⭐, pièces d'or 🪙 et échange. Si l'échange est possible, un bouton propose de changer
 * des étoiles contre des pièces (avec le choix du nombre) ; sinon une barre de progression montre ce qu'il reste.
 */
@Component({
  selector: 'app-piggy-bank',
  imports: [MatButtonModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bank" [class.falling]="falling()">
      <span class="stat" [title]="starsLabel()">
        <span class="icon" aria-hidden="true">⭐</span>
        <strong>{{ shop().stars() }}</strong>
        <span class="sr" i18n="@@piggy.stars">{shop().stars(), plural, =1 {étoile disponible} other {étoiles disponibles}}</span>
      </span>
      <span class="stat coin" #coin>
        <span class="icon" aria-hidden="true">🪙</span>
        <strong>{{ shop().pieces() }}</strong>
        <span class="sr" i18n="@@piggy.coins">{shop().pieces(), plural, =1 {pièce d'or} other {pièces d'or}}</span>
      </span>

      @if (canExchange()) {
        <button type="button" matButton="filled" class="exchange" (click)="exchange()">
          <ng-container i18n="@@piggy.exchange">Échanger {{ shop().rate() }} ⭐ → 1 🪙</ng-container>
        </button>
      } @else if (shop().wallet()) {
        <span class="progress">
          <span class="remaining" i18n="@@piggy.remaining">Encore {{ missing() }} ⭐ pour gagner une pièce !</span>
          <mat-progress-bar mode="determinate" [value]="progress()" aria-hidden="true" />
        </span>
      }

      <!-- Les étoiles tombent dans la tirelire -->
      <span class="drops" aria-hidden="true">
        @for (i of drops; track i) {
          <span class="drop" [style.--i]="i">⭐</span>
        }
      </span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .bank {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
      padding: 8px 14px;
      border-radius: 20px;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
    .stat {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 700 22px / 1 Roboto;
    }
    .icon {
      font-size: 26px;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .exchange {
      min-height: 44px;
    }
    .progress {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 160px;
      min-width: 140px;
    }
    .remaining {
      font: var(--mat-sys-label-large);
    }
    .drops {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      border-radius: inherit;
    }
    .drop {
      position: absolute;
      top: -30px;
      left: calc(10% + var(--i) * 10%);
      font-size: 20px;
      opacity: 0;
    }
    .falling .drop {
      animation: fall 1.1s ease-in calc(var(--i) * 0.07s) both;
    }
    @keyframes fall {
      0% {
        opacity: 1;
        transform: translateY(0) rotate(0);
      }
      100% {
        opacity: 0;
        transform: translateY(70px) rotate(220deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .falling .drop {
        animation: none;
      }
    }
  `,
})
export class PiggyBank {
  readonly memberId = input.required<number>();
  /** Change quand les étoiles ont pu changer (routine terminée) : le porte-monnaie est relu. */
  readonly version = input(0);

  private readonly shopService = inject(ShopService);
  private readonly dialog = inject(MatDialog);

  protected readonly shop = computed(() => this.shopService.of(this.memberId()));
  protected readonly drops = [0, 1, 2, 3, 4, 5, 6, 7];
  protected readonly falling = signal(false);

  protected readonly canExchange = computed(() => this.shop().exchangeable() >= 1);
  /** Étoiles restantes avant la prochaine pièce. */
  protected readonly missing = computed(() => this.shop().rate() - (this.shop().stars() % this.shop().rate()));
  protected readonly progress = computed(() => (100 * (this.shop().stars() % this.shop().rate())) / this.shop().rate());
  protected readonly starsLabel = computed(() => $localize`:@@piggy.starsTitle:Étoiles disponibles : ${this.shop().stars()}:count:`);

  constructor() {
    // Chargement (et rechargement quand on change de membre)
    effect(() => {
      const shop = this.shop();
      this.version();
      untracked(() => shop.load().subscribe({ error: () => undefined }));
    });
  }

  protected exchange(): void {
    const shop = this.shop();
    this.dialog
      .open<ExchangeDialog, ExchangeDialogData, boolean>(ExchangeDialog, { data: { memberId: shop.memberId }, width: '420px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((done) => {
        if (done) {
          this.falling.set(false);
          // relance l'animation même si un échange précédent l'avait déjà jouée
          setTimeout(() => this.falling.set(true));
          setTimeout(() => this.falling.set(false), 1800);
        }
      });
  }
}
