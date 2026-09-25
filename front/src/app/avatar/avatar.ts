import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FamilyMemberDTO } from '../api-client';
import { AvatarConfig, defaultAvatar, normalizeAvatar } from './avatar-config';
import { drawAvatar } from './avatar-layers';

let nextId = 0;

/**
 * Personnage d'un membre, en SVG pur (aucune image externe). Deux usages :
 * - `<app-avatar [member]="m" [size]="32" />` : avatar du membre, ou son avatar par défaut s'il n'en a pas ;
 * - `<app-avatar [config]="config" [size]="240" />` : une config quelconque (éditeur).
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[class.round]': 'round()',
  },
  template: `
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      [attr.aria-hidden]="label() ? null : 'true'"
    >
      @let bg = drawing().background;
      @if ('gradient' in bg) {
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" [attr.stop-color]="bg.gradient.from" />
            <stop offset="1" [attr.stop-color]="bg.gradient.to" />
          </linearGradient>
        </defs>
        <rect data-layer="background" width="200" height="200" [attr.fill]="'url(#' + gradientId + ')'" />
      } @else {
        <rect data-layer="background" width="200" height="200" [attr.fill]="bg.color" />
      }
      @for (layer of drawing().layers; track layer.key) {
        <g [attr.data-layer]="layer.key" [attr.data-part]="layer.part">
          @for (s of layer.shapes; track $index) {
            @switch (s.el) {
              @case ('path') {
                <path
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
                <circle
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
                <ellipse
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
                <rect
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
        </g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      overflow: hidden;
      border-radius: 16%;
      line-height: 0;
    }
    :host(.round) {
      border-radius: 50%;
    }
    svg {
      display: block;
    }
  `,
})
export class Avatar {
  /** Membre : son avatar, ou son avatar par défaut (déterministe, d'après son id et sa couleur). */
  readonly member = input<FamilyMemberDTO | null | undefined>();
  /** Config explicite (prioritaire sur celle du membre). */
  readonly config = input<AvatarConfig | null | undefined>();
  readonly size = input(40);
  readonly round = input(true);
  /** Libellé accessible ; par défaut le nom du membre. Vide = décoratif (le nom est déjà écrit à côté). */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'label' });

  protected readonly gradientId = `avatar-gradient-${nextId++}`;

  protected readonly label = computed(() => this.ariaLabel() ?? '');

  protected readonly drawing = computed(() => {
    const member = this.member();
    const fallback = defaultAvatar(member?.id ?? 0, member?.couleur);
    return drawAvatar(normalizeAvatar(this.config() ?? member?.avatarConfig, fallback));
  });
}
