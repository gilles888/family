import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SvgShapes } from '../shared/svg/svg-shapes';
import { SEASON_PICTOS } from './season-pictos';
import { SeasonId } from './seasons';

/** Petit pictogramme d'un thème (décoratif : le nom du thème est écrit à côté quand il importe). */
@Component({
  selector: 'app-season-picto',
  imports: [SvgShapes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.width.px]': 'size()', '[style.height.px]': 'size()' },
  template: `
    <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
      <g [appShapes]="shapes()"></g>
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      line-height: 0;
    }
  `,
})
export class SeasonPicto {
  readonly id = input.required<SeasonId>();
  readonly size = input(32);
  protected readonly shapes = computed(() => SEASON_PICTOS[this.id()]);
}
