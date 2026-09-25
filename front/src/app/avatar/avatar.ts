import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FamilyMemberDTO } from '../api-client';
import { SvgShapes } from '../shared/svg/svg-shapes';
import { AvatarConfig, defaultAvatar, normalizeAvatar } from './avatar-config';
import { LayerKey, drawAvatar } from './avatar-layers';

let nextId = 0;

const FULL_FRAME = '0 0 200 200';
/** Tête et haut des épaules. */
const HEAD_FRAME = '36 22 128 128';
/** En dessous (px), cadrage sur la tête. */
const SMALL = 40;

/**
 * Personnage d'un membre, en SVG pur (aucune image externe). Deux usages :
 * - `<app-avatar [member]="m" [size]="32" />` : avatar du membre, ou son avatar par défaut s'il n'en a pas ;
 * - `<app-avatar [config]="config" [size]="240" />` : une config quelconque (éditeur).
 */
@Component({
  selector: 'app-avatar',
  imports: [SvgShapes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width]': 'size() === null ? "100%" : size() + "px"',
    '[style.height]': 'size() === null ? "auto" : size() + "px"',
    '[class.round]': 'round()',
  },
  template: `
    <svg
      [attr.viewBox]="frame()"
      width="100%"
      height="100%"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      [attr.aria-hidden]="label() ? null : 'true'"
    >
      @let bg = drawing().background;
      @if (only()) {
        <!-- pièce seule : pas de fond -->
      } @else if ('gradient' in bg) {
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
        <g [attr.data-layer]="layer.key" [attr.data-part]="layer.part" [appShapes]="layer.shapes"></g>
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
      aspect-ratio: 1;
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
  /** Côté en px ; null = toute la largeur du conteneur (carré). */
  readonly size = input<number | null>(40);
  /**
   * Cadrage : une zone précise (vignettes de chapeaux, d'yeux…) ; par défaut tout le personnage, ou seulement la tête
   * sous 40 px (mini-avatars de l'agenda : le visage reste reconnaissable).
   */
  readonly viewBox = input<string | null>(null);

  protected readonly frame = computed(() => {
    const size = this.size();
    return this.viewBox() ?? (size !== null && size < SMALL ? HEAD_FRAME : FULL_FRAME);
  });
  readonly round = input(true);
  /** Libellé accessible ; par défaut le nom du membre. Vide = décoratif (le nom est déjà écrit à côté). */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'label' });

  /** Ne dessiner que ces calques, sans fond (aperçu d'une pièce seule). */
  readonly only = input<(LayerKey | 'hat' | 'accessory')[] | null>(null);

  protected readonly gradientId = `avatar-gradient-${nextId++}`;

  protected readonly label = computed(() => this.ariaLabel() ?? '');

  protected readonly drawing = computed(() => {
    const member = this.member();
    const fallback = defaultAvatar(member?.id ?? 0, member?.couleur);
    const drawing = drawAvatar(normalizeAvatar(this.config() ?? member?.avatarConfig, fallback));
    const only = this.only();
    return only ? { ...drawing, layers: drawing.layers.filter((l) => (only as string[]).includes(l.key)) } : drawing;
  });
}
