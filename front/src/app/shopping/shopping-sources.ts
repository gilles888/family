import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ShoppingItemSourceDTO } from '../api-client';
import { parseIsoDate } from '../shared/date-utils';

/** Repas d'origine d'une ligne générée : « pour : Lasagnes lun., Soupe mer. » (jours dans la langue du build). */
@Component({
  selector: 'app-shopping-sources',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container i18n="@@shopping.for">pour :</ng-container>
    @for (s of meals(); track $index; let last = $last) {
      {{ s.titre }} {{ s.day | date: 'EEE' }}{{ last ? '' : ',' }}
    }
  `,
})
export class ShoppingSources {
  readonly sources = input.required<ShoppingItemSourceDTO[]>();

  protected readonly meals = computed(() => this.sources().map((s) => ({ titre: s.titre, day: parseIsoDate(s.date!) })));
}
