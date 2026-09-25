import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { parseIsoDate } from '../../shared/date-utils';
import { ShoppingStore } from '../../shopping/shopping-store';

/** Nombre d'articles nommés dans l'aperçu. */
const PREVIEW_SIZE = 5;

/** Carte « Courses » : articles restant à acheter, aperçu, accès à la liste complète. */
@Component({
  selector: 'app-shopping-card',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <h2 class="heading" i18n="@@shoppingCard.title">Courses</h2>
      <a matButton routerLink="/courses">
        <mat-icon>shopping_cart</mat-icon>
        <ng-container i18n="@@shoppingCard.open">Voir la liste</ng-container>
      </a>
    </div>

    @if (store.list.hasValue()) {
      @let list = store.list.value();
      <p class="count">
        <ng-container i18n="@@shopping.remaining">{store.toBuy().length, plural, =0 {Rien à acheter} =1 {1 article à acheter} other {{{ store.toBuy().length }} articles à acheter}}</ng-container>
      </p>
      @if (preview().length > 0) {
        <p class="preview">{{ preview().join(', ') }}{{ store.toBuy().length > preview().length ? '…' : '' }}</p>
      }
      @if (period(); as p) {
        <p class="period" i18n="@@shoppingCard.period">Repas du {{ p.from | date: 'd MMM' }} au {{ p.to | date: 'd MMM' }}</p>
      } @else if ((list.articles ?? []).length === 0) {
        <p class="period" i18n="@@shoppingCard.never">Pas encore de liste : générez-la depuis les repas planifiés.</p>
      }
    } @else if (store.list.error()) {
      <div class="error">
        <span i18n="@@shoppingCard.error">Liste de courses indisponible.</span>
        <button matButton (click)="store.list.reload()" i18n="@@common.retry">Réessayer</button>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0 8px;
    }
    .heading {
      margin: 0;
      font: var(--mat-sys-title-large);
    }
    p {
      margin: 4px 0 0;
    }
    .count {
      font: var(--mat-sys-title-medium);
    }
    .preview {
      overflow-wrap: anywhere;
    }
    .period,
    .error {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
  `,
})
export class ShoppingCard {
  protected readonly store = inject(ShoppingStore);

  protected readonly preview = computed(() => this.store.toBuy().slice(0, PREVIEW_SIZE).map((i) => i.nom));
  protected readonly period = computed(() => {
    const list = this.store.list.hasValue() ? this.store.list.value() : undefined;
    return list?.dateDebut && list.dateFin
      ? { from: parseIsoDate(list.dateDebut), to: parseIsoDate(list.dateFin) }
      : undefined;
  });

  constructor() {
    // La liste a pu changer (page Courses, autre appareil) depuis son premier chargement
    if (this.store.list.hasValue()) {
      this.store.list.reload();
    }
  }
}
