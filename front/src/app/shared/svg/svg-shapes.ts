import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Shape } from './shapes';

/**
 * Dessine une liste de formes (catalogues des avatars et des icônes de routine) dans un groupe SVG :
 * `<svg:g [appShapes]="shapes" />`. Les couleurs doivent déjà être résolues.
 */
@Component({
  selector: 'g[appShapes]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (s of shapes(); track $index) {
      @switch (s.el) {
        @case ('path') {
          <svg:path
            [attr.d]="s.d"
            [attr.fill]="s.fill"
            [attr.stroke]="s.stroke"
            [attr.stroke-width]="s.sw"
            [attr.opacity]="s.opacity"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }
        @case ('circle') {
          <svg:circle
            [attr.cx]="s.cx"
            [attr.cy]="s.cy"
            [attr.r]="s.r"
            [attr.fill]="s.fill"
            [attr.stroke]="s.stroke"
            [attr.stroke-width]="s.sw"
            [attr.opacity]="s.opacity"
          />
        }
        @case ('ellipse') {
          <svg:ellipse
            [attr.cx]="s.cx"
            [attr.cy]="s.cy"
            [attr.rx]="s.rx"
            [attr.ry]="s.ry"
            [attr.fill]="s.fill"
            [attr.stroke]="s.stroke"
            [attr.stroke-width]="s.sw"
            [attr.opacity]="s.opacity"
          />
        }
        @case ('rect') {
          <svg:rect
            [attr.x]="s.x"
            [attr.y]="s.y"
            [attr.width]="s.w"
            [attr.height]="s.h"
            [attr.rx]="s.rx"
            [attr.fill]="s.fill"
            [attr.stroke]="s.stroke"
            [attr.stroke-width]="s.sw"
            [attr.opacity]="s.opacity"
          />
        }
      }
    }
  `,
})
export class SvgShapes {
  readonly shapes = input.required<Shape[]>({ alias: 'appShapes' });
}
