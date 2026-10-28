import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FamilyMemberDTO } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { AvatarConfig } from '../avatar/avatar-config';
import { findArticle } from '../avatar/article-info';
import { MemberShop, ShopService } from './shop.service';

export interface BuyDialogData {
  member: FamilyMemberDTO;
  /** Le personnage habillé des articles à acheter. */
  config: AvatarConfig;
  articleIds: string[];
}

/**
 * Achat : le personnage habillé, ce qu'on achète, le solde avant / après, puis une petite célébration.
 * Se ferme avec `true` une fois les achats faits.
 */
@Component({
  selector: 'app-buy-dialog',
  imports: [MatButtonModule, MatDialogModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!done()) {
      <h2 mat-dialog-title i18n="@@buy.title">On l'achète ?</h2>
      <mat-dialog-content class="content">
        <app-avatar class="hero" [config]="data.config" [member]="data.member" [size]="160" [round]="false" label="" />
        <ul class="items">
          @for (item of items; track item.id) {
            <li><span>{{ item.label }}</span><span class="price">🪙 {{ item.price }}</span></li>
          }
        </ul>
        <p class="balance" i18n="@@buy.balance">Tu as 🪙 {{ before }} → il te restera 🪙 {{ before - total }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" matButton mat-dialog-close i18n="@@common.cancel">Annuler</button>
        <button type="button" matButton="filled" class="buy" (click)="buy()" [disabled]="buying()">
          <ng-container i18n="@@buy.confirm">Acheter pour {{ total }} 🪙</ng-container>
        </button>
      </mat-dialog-actions>
    } @else {
      <mat-dialog-content class="celebration" aria-live="polite">
        <span class="sparkles" aria-hidden="true">
          @for (i of sparkles; track i) {
            <span class="sparkle" [style.--i]="i">{{ i % 2 ? '⭐' : '🪙' }}</span>
          }
        </span>
        <app-avatar class="hero jump" [config]="data.config" [member]="data.member" [size]="160" [round]="false" label="" />
        <p class="bravo" i18n="@@buy.bravo">Bravo ! C'est à toi !</p>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button type="button" matButton="filled" (click)="ref.close(true)" i18n="@@buy.close">Super !</button>
      </mat-dialog-actions>
    }
  `,
  styles: `
    .content,
    .celebration {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .hero {
      border-radius: 24px;
      box-shadow: 0 0 0 4px #ffffff, var(--mat-sys-level2);
    }
    .items {
      list-style: none;
      margin: 0;
      padding: 0;
      width: 100%;
      font: var(--mat-sys-body-large);
    }
    .items li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
    }
    .price {
      font-weight: 700;
    }
    .balance {
      margin: 0;
      font: var(--mat-sys-title-medium);
      text-align: center;
    }
    .buy {
      min-height: 48px;
    }
    .celebration {
      position: relative;
      overflow: hidden;
      padding-top: 24px !important;
      background: linear-gradient(180deg, #fff3e0, #fffde7);
    }
    .sparkles {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .sparkle {
      position: absolute;
      left: calc(var(--i) * 11%);
      bottom: -30px;
      font-size: 26px;
      animation: rise 1.8s ease-out calc(var(--i) * 0.15s) infinite;
    }
    @keyframes rise {
      to {
        transform: translateY(-260px) rotate(200deg);
        opacity: 0;
      }
    }
    .jump {
      animation: hop 800ms ease-in-out 3;
    }
    @keyframes hop {
      30% {
        transform: translateY(-28px) scale(1.05);
      }
      60% {
        transform: translateY(0) scale(0.97);
      }
    }
    .bravo {
      margin: 0;
      font: 800 clamp(22px, 5.5vw, 30px) / 1.2 Roboto;
      color: #ef6c00;
      text-align: center;
    }
    @media (prefers-reduced-motion: reduce) {
      .sparkle,
      .jump {
        animation: none;
      }
    }
  `,
})
export class BuyDialog {
  protected readonly data = inject<BuyDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<BuyDialog, boolean>>(MatDialogRef);
  private readonly shopService = inject(ShopService);
  private readonly shop: MemberShop = this.shopService.of(this.data.member.id!);

  protected readonly items = this.data.articleIds.map((id) => ({ id, label: findArticle(id)?.label ?? id, price: this.shopService.price(id) }));
  protected readonly total = this.items.reduce((sum, i) => sum + i.price, 0);
  protected readonly before = this.shop.pieces();
  protected readonly sparkles = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly buying = signal(false);
  protected readonly done = signal(false);

  /** Achète les articles un par un (chaque achat est vérifié par le serveur). */
  protected buy(): void {
    this.buying.set(true);
    const next = (index: number): void => {
      if (index >= this.items.length) {
        this.done.set(true);
        return;
      }
      this.shop.buy(this.items[index].id).subscribe({
        next: () => next(index + 1),
        error: () => {
          this.buying.set(false);
          // ce qui a été acheté reste acheté : l'éditeur recalcule ce qui manque
          if (index > 0) {
            this.ref.close(false);
          }
        },
      });
    };
    next(0);
  }
}
