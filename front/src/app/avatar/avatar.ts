import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FamilyMemberDTO } from '../api-client';
import { ActiveTheme } from '../theme/active-theme';
import { SeasonId, toApiTheme } from '../theme/seasons';
import { SvgShapes } from '../shared/svg/svg-shapes';
import { BODY_FRAME, BUST_FRAME, HEAD_FRAME, HEAD_TRANSFORM } from './avatar-body';
import { AvatarConfig, defaultAvatar, normalizeAvatar } from './avatar-config';
import { LayerKey, drawAvatar } from './avatar-layers';

let nextId = 0;

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
    '[style.height]': 'size() === null ? "auto" : (full() ? size()! * 1.5 : size()) + "px"',
    '[class.full]': 'full()',
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
      <defs>
        <!-- ombrage du corps : ids propres à ce SVG -->
        <linearGradient [attr.id]="ids.shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0.18" />
          <stop offset="0.45" stop-color="#000" stop-opacity="0" />
          <stop offset="1" stop-color="#1a0b2e" stop-opacity="0.3" />
        </linearGradient>
        <linearGradient [attr.id]="ids.shadeV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a0b2e" stop-opacity="0.22" />
          <stop offset="0.25" stop-color="#1a0b2e" stop-opacity="0" />
        </linearGradient>
        @if (!only() && !bare() && 'gradient' in bg) {
          <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" [attr.stop-color]="bg.gradient.from" />
            <stop offset="1" [attr.stop-color]="bg.gradient.to" />
          </linearGradient>
        }
      </defs>
      @if (only() || bare()) {
        <!-- pièce seule, ou personnage dans un décor : pas de fond -->
      } @else if ('gradient' in bg) {
        <rect
          data-layer="background"
          x="-100"
          y="-100"
          width="400"
          height="500"
          [attr.fill]="'url(#' + gradientId + ')'"
        />
      } @else {
        <rect data-layer="background" x="-100" y="-100" width="400" height="500" [attr.fill]="bg.color" />
      }
      @for (layer of drawing().layers; track layer.key) {
        <g
          [attr.data-layer]="layer.key"
          [attr.transform]="layer.space === 'head' ? headTransform : null"
          [attr.data-part]="layer.part"
          [appShapes]="layer.shapes"
        ></g>
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
    :host(.full) {
      aspect-ratio: 2 / 3;
      border-radius: 16%;
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
    return this.viewBox() ?? (this.full() ? BODY_FRAME : size !== null && size < SMALL ? HEAD_FRAME : BUST_FRAME);
  });
  /** Personnage entier (200 × 300) au lieu du buste ; `size` est alors la largeur. */
  readonly full = input(false);
  readonly round = input(true);
  /** Libellé accessible ; par défaut le nom du membre. Vide = décoratif (le nom est déjà écrit à côté). */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'label' });

  /** Sans fond : le personnage se tient dans un décor (la chambre). */
  readonly bare = input(false);

  /** Ne dessiner que ces calques, sans fond (aperçu d'une pièce seule). */
  readonly only = input<(LayerKey | 'hat' | 'accessory')[] | null>(null);

  private readonly activeTheme = inject(ActiveTheme).id;

  private readonly uid = nextId++;
  protected readonly gradientId = `avatar-gradient-${this.uid}`;
  protected readonly ids = { shade: `avatar-shade-${this.uid}`, shadeV: `avatar-shade-v-${this.uid}` };
  protected readonly headTransform = HEAD_TRANSFORM;

  protected readonly label = computed(() => this.ariaLabel() ?? '');

  protected readonly drawing = computed(() => {
    const member = this.member();
    const fallback = defaultAvatar(member?.id ?? 0, member?.couleur);
    const raw = this.config() ?? themeOutfit(member, this.activeTheme()) ?? member?.avatarConfig;
    const drawing = drawAvatar(normalizeAvatar(raw, fallback), { memberColor: member?.couleur, ids: this.ids });
    const only = this.only();
    return only
      ? { ...drawing, layers: drawing.layers.filter((l) => (only as string[]).includes(l.key)) }
      : drawing;
  });
}

/** Tenue enregistrée par le membre pour le thème du moment (si « porter automatiquement » est actif). */
function themeOutfit(member: FamilyMemberDTO | null | undefined, theme: string): Record<string, unknown> | undefined {
  if (!member || member.tenueAuto === false || theme === 'neutre') {
    return undefined;
  }
  return member.tenues?.[toApiTheme(theme as SeasonId)];
}
