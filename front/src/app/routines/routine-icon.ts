import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SvgShapes } from '../shared/svg/svg-shapes';
import { routineIcon } from './routine-icons';

/** Illustration d'une étape de routine (catalogue routine-icons.ts). */
@Component({
  selector: 'app-routine-icon',
  imports: [SvgShapes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    <svg viewBox="0 0 100 100" width="100%" height="100%" [attr.aria-hidden]="true">
      <g [appShapes]="definition().shapes" [attr.data-icon]="definition().id"></g>
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      line-height: 0;
    }
    svg {
      display: block;
    }
  `,
})
export class RoutineIllustration {
  readonly icon = input.required<string>();
  readonly size = input(48);

  protected readonly definition = computed(() => routineIcon(this.icon()));
}
