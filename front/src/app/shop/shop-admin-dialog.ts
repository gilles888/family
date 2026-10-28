import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { BoutiqueService, CoinTransactionDTO, FamilyMemberDTO, MemberItemDTO } from '../api-client';
import { findArticle } from '../avatar/article-info';
import { Avatar } from '../avatar/avatar';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { NotificationService } from '../shared/notification.service';
import { ShopService } from './shop.service';

export interface ShopAdminData {
  member: FamilyMemberDTO;
}

const TYPE_LABELS: Record<string, string> = {
  ECHANGE: $localize`:@@shopAdmin.type.exchange:Échange d'étoiles`,
  ACHAT: $localize`:@@shopAdmin.type.purchase:Achat`,
  CADEAU: $localize`:@@shopAdmin.type.gift:Cadeau`,
  REMBOURSEMENT: $localize`:@@shopAdmin.type.refund:Remboursement`,
  AJUSTEMENT: $localize`:@@shopAdmin.type.adjustment:Ajustement`,
};

/** Parent : boutique d'un enfant. Solde, taux de change, cadeau, remboursement, ajustement et historique. */
@Component({
  selector: 'app-shop-admin-dialog',
  imports: [DatePipe, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="title">
      <app-avatar [member]="data.member" [size]="40" label="" />
      <ng-container i18n="@@shopAdmin.title">Boutique de {{ data.member.nom }}</ng-container>
    </h2>
    <mat-dialog-content class="content">
      <p class="balance" aria-live="polite">
        <span>⭐ {{ shop.stars() }}</span>
        <span>🪙 {{ shop.pieces() }}</span>
        <span class="muted" i18n="@@shopAdmin.converted">{{ shop.wallet()?.etoilesConverties ?? 0 }} ⭐ déjà échangées</span>
      </p>

      <section class="block">
        <h3 i18n="@@shopAdmin.rate">Étoiles par pièce (pour toute la famille)</h3>
        <div class="row">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label i18n="@@shopAdmin.rateLabel">Étoiles pour 1 pièce</mat-label>
            <input matInput type="number" min="1" max="1000" [ngModel]="rate()" (ngModelChange)="rate.set($event)" />
          </mat-form-field>
          <button type="button" matButton="tonal" (click)="saveRate()" [disabled]="!rateValid()" i18n="@@shopAdmin.rateSave">Enregistrer le taux</button>
        </div>
      </section>

      <section class="block">
        <h3 i18n="@@shopAdmin.gift">Offrir un article</h3>
        <div class="row">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label i18n="@@shopAdmin.article">Article</mat-label>
            <mat-select [ngModel]="giftId()" (ngModelChange)="giftId.set($event)">
              @for (a of giftable(); track a.id) {
                <mat-option [value]="a.id">{{ a.label }} · 🪙 {{ a.prix }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button type="button" matButton="tonal" (click)="gift()" [disabled]="!giftId()" i18n="@@shopAdmin.giftButton">Offrir</button>
        </div>
      </section>

      <section class="block">
        <h3 i18n="@@shopAdmin.adjust">Ajuster les pièces</h3>
        <div class="row">
          <mat-form-field class="narrow" subscriptSizing="dynamic">
            <mat-label i18n="@@shopAdmin.adjustPieces">Pièces (+ ou −)</mat-label>
            <input matInput type="number" [ngModel]="adjustPieces()" (ngModelChange)="adjustPieces.set($event)" />
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label i18n="@@shopAdmin.adjustReason">Motif (obligatoire)</mat-label>
            <input matInput maxlength="255" [ngModel]="adjustReason()" (ngModelChange)="adjustReason.set($event)" />
          </mat-form-field>
          <button type="button" matButton="tonal" (click)="adjust()" [disabled]="!adjustValid()" i18n="@@shopAdmin.adjustButton">Ajuster</button>
        </div>
      </section>

      <section class="block">
        <h3 i18n="@@shopAdmin.owned">Articles achetés ou offerts</h3>
        @if (items().length === 0) {
          <p class="muted" i18n="@@shopAdmin.noItems">Aucun pour le moment.</p>
        }
        <ul class="list">
          @for (item of items(); track item.articleId) {
            <li>
              <span>{{ label(item.articleId!) }}</span>
              <span class="muted">🪙 {{ item.prixPaye }}</span>
              <button type="button" matButton (click)="refund(item)" i18n="@@shopAdmin.refund">Rembourser</button>
            </li>
          }
        </ul>
      </section>

      <section class="block">
        <h3 i18n="@@shopAdmin.history">Historique</h3>
        @if (transactions().length === 0) {
          <p class="muted" i18n="@@shopAdmin.noHistory">Aucun mouvement.</p>
        }
        <ul class="list">
          @for (t of transactions(); track t.id) {
            <li>
              <span>{{ typeLabel(t) }}@if (t.articleId) { · {{ label(t.articleId) }} }@if (t.commentaire) { · {{ t.commentaire }} }</span>
              <span [class.minus]="t.pieces! < 0">{{ t.pieces! > 0 ? '+' : '' }}{{ t.pieces }} 🪙@if (t.etoiles) { · {{ t.etoiles }} ⭐ }</span>
              <span class="muted">{{ t.creeLe | date: 'short' }}</span>
            </li>
          }
        </ul>
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" matButton mat-dialog-close i18n="@@common.close">Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .balance {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: baseline;
      margin: 0;
      font: 700 24px / 1 Roboto;
    }
    .block h3 {
      margin: 0 0 8px;
      font: var(--mat-sys-title-small);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .row mat-form-field {
      flex: 1 1 180px;
    }
    .row .narrow {
      flex: 0 1 140px;
    }
    .muted {
      font: var(--mat-sys-body-small);
      font-weight: 400;
      color: var(--mat-sys-on-surface-variant);
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .list li {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .list li > span:first-child {
      flex: 1 1 200px;
    }
    .minus {
      color: var(--mat-sys-error);
    }
  `,
})
export class ShopAdminDialog {
  protected readonly data = inject<ShopAdminData>(MAT_DIALOG_DATA);
  private readonly api = inject(BoutiqueService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly shopService = inject(ShopService);
  protected readonly shop = this.shopService.of(this.data.member.id!);

  protected readonly items = signal<MemberItemDTO[]>([]);
  protected readonly transactions = signal<CoinTransactionDTO[]>([]);
  protected readonly rate = signal<number | null>(null);
  protected readonly giftId = signal<string | null>(null);
  protected readonly adjustPieces = signal<number | null>(null);
  protected readonly adjustReason = signal('');

  protected readonly rateValid = computed(() => Number.isInteger(this.rate()) && this.rate()! >= 1 && this.rate()! <= 1000);
  protected readonly adjustValid = computed(() => Number.isInteger(this.adjustPieces()) && this.adjustPieces() !== 0 && this.adjustReason().trim().length > 0);

  /** Articles payants que le membre n'a pas encore, par thème puis nom. */
  protected readonly giftable = computed(() => {
    this.items();
    return [...this.shopService.catalogue().values()]
      .filter((a) => a.prix! > 0 && !this.shop.owns(a.id!))
      .map((a) => ({ id: a.id!, prix: a.prix!, label: this.label(a.id!), theme: a.theme ?? '' }))
      .sort((a, b) => a.theme.localeCompare(b.theme) || a.label.localeCompare(b.label));
  });

  constructor() {
    this.reload();
    this.api.getReglageBoutique().subscribe((s) => this.rate.set(s.etoilesParPiece ?? null));
  }

  protected label(articleId: string): string {
    return findArticle(articleId)?.label ?? articleId;
  }

  protected typeLabel(t: CoinTransactionDTO): string {
    return TYPE_LABELS[t.type!] ?? t.type!;
  }

  private reload(): void {
    const id = this.data.member.id!;
    forkJoin([this.shop.load(), this.api.listArticlesPossedes(id), this.api.listTransactionsPieces(id)]).subscribe(([, items, transactions]) => {
      this.items.set(items);
      this.transactions.set(transactions);
    });
  }

  protected saveRate(): void {
    this.api.updateReglageBoutique({ etoilesParPiece: this.rate()! }).subscribe(() => {
      this.notifications.success($localize`:@@shopAdmin.rateSaved:Taux enregistré.`);
      this.reload();
    });
  }

  protected gift(): void {
    this.shop.gift(this.giftId()!).subscribe(() => {
      this.notifications.success($localize`:@@shopAdmin.gifted:Article offert.`);
      this.giftId.set(null);
      this.reload();
    });
  }

  protected adjust(): void {
    this.api.ajusterPieces(this.data.member.id!, { pieces: this.adjustPieces()!, commentaire: this.adjustReason().trim() }).subscribe(() => {
      this.notifications.success($localize`:@@shopAdmin.adjusted:Pièces ajustées.`);
      this.adjustPieces.set(null);
      this.adjustReason.set('');
      this.reload();
    });
  }

  protected refund(item: MemberItemDTO): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: $localize`:@@shopAdmin.refundTitle:Rembourser cet article ?`,
          message: $localize`:@@shopAdmin.refundMessage:« ${this.label(item.articleId!)}:article: » est retiré, ${item.prixPaye}:price: 🪙 sont rendues et le personnage ne le porte plus.`,
          confirmLabel: $localize`:@@shopAdmin.refund:Rembourser`,
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.api.rembourserArticle(this.data.member.id!, { articleId: item.articleId! }).subscribe(() => {
            this.notifications.success($localize`:@@shopAdmin.refunded:Article remboursé.`);
            this.reload();
          });
        }
      });
  }
}
