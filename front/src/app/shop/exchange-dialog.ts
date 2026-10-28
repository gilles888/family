import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ShopService } from './shop.service';

export interface ExchangeDialogData {
  memberId: number;
}

/** Échange d'étoiles contre des pièces : on choisit combien de pièces (le plus possible par défaut). */
@Component({
  selector: 'app-exchange-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title i18n="@@exchange.title">Échanger des étoiles</h2>
    <mat-dialog-content>
      <p class="rate" i18n="@@exchange.rate">1 🪙 = {{ shop.rate() }} ⭐</p>
      <div class="picker">
        <button type="button" matIconButton (click)="count.set(count() - 1)" [disabled]="count() <= 1" i18n-aria-label="@@exchange.less" aria-label="Moins">
          <mat-icon>remove</mat-icon>
        </button>
        <span class="count" aria-live="polite"><span aria-hidden="true">🪙</span> {{ count() }}</span>
        <button type="button" matIconButton (click)="count.set(count() + 1)" [disabled]="count() >= shop.exchangeable()" i18n-aria-label="@@exchange.more" aria-label="Plus">
          <mat-icon>add</mat-icon>
        </button>
      </div>
      <p class="cost" i18n="@@exchange.cost">{{ count() * shop.rate() }} ⭐ → {{ count() }} 🪙</p>
      <p class="after" i18n="@@exchange.after">Il te restera {{ shop.stars() - count() * shop.rate() }} ⭐</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" matButton mat-dialog-close i18n="@@common.cancel">Annuler</button>
      <button type="button" matButton="filled" (click)="confirm()" [disabled]="saving()" i18n="@@exchange.confirm">Échanger</button>
    </mat-dialog-actions>
  `,
  styles: `
    .rate,
    .cost,
    .after {
      margin: 0 0 8px;
      text-align: center;
    }
    .rate {
      color: var(--mat-sys-on-surface-variant);
    }
    .cost {
      font: var(--mat-sys-title-large);
    }
    .picker {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin: 8px 0 12px;
    }
    .count {
      min-width: 90px;
      text-align: center;
      font: 800 36px / 1 Roboto;
    }
  `,
})
export class ExchangeDialog {
  private readonly ref = inject<MatDialogRef<ExchangeDialog, boolean>>(MatDialogRef);
  protected readonly shop = inject(ShopService).of(inject<ExchangeDialogData>(MAT_DIALOG_DATA).memberId);

  protected readonly count = signal(Math.max(1, this.shop.exchangeable()));
  protected readonly saving = signal(false);

  protected confirm(): void {
    this.saving.set(true);
    this.shop.exchange(this.count()).subscribe({
      next: () => this.ref.close(true),
      error: () => this.saving.set(false),
    });
  }
}
