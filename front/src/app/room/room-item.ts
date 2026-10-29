import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FamilyMemberDTO } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { AvatarConfig } from '../avatar/avatar-config';
import { WardrobeOption } from '../avatar/avatar-wardrobe';

/**
 * Une affaire rangée dans un meuble : vignette du personnage avec la pièce (ou pastille de couleur), et les badges de la
 * boutique (prix, cadenas, « Spécial thème »). Présentation seulement : poser la pièce est décidé par le meuble.
 */
@Component({
  selector: 'app-room-item',
  imports: [Avatar, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.swatch]': '!!option().swatch', '[class.none]': 'option().none', '[class.selected]': 'selected()' },
  template: `
    <button
      type="button"
      class="item"
      [class.locked]="!owned()"
      [attr.aria-pressed]="selected()"
      [attr.aria-label]="option().label"
      [title]="option().label"
      (click)="wear.emit(option())"
    >
      @if (option().swatch) {
        <span class="dot" [style.background]="option().swatch"></span>
      } @else if (option().none) {
        <mat-icon class="no">block</mat-icon>
      } @else {
        <app-avatar [config]="config()" [member]="member()" [size]="null" [round]="false" [bare]="true" [viewBox]="viewBox()" label="" />
      }
      @if (special()) {
        <span class="special" aria-hidden="true" [title]="'✨ ' + themeName()">✨</span>
        <span class="sr" i18n="@@shop.special">Spécial {{ themeName() }}</span>
      }
      @if (selected()) {
        <span class="tick" aria-hidden="true"><mat-icon>check</mat-icon></span>
      }
      @if (!owned()) {
        <!-- cadenas et prix dans un seul petit badge, dans le coin : l'article reste entièrement visible -->
        <span class="chip" aria-hidden="true"><mat-icon class="lock">lock</mat-icon>{{ price() }}</span>
        <span class="sr" i18n="@@shop.notOwned">À acheter : {{ price() }} 🪙</span>
      }
    </button>
  `,
  styleUrl: './room-item.scss',
})
export class RoomItem {
  readonly option = input.required<WardrobeOption>();
  /** Le personnage avec cette pièce (aperçu). */
  readonly config = input<AvatarConfig | null>(null);
  readonly member = input<FamilyMemberDTO | null>(null);
  readonly viewBox = input<string | null>(null);
  readonly selected = input(false);
  readonly owned = input(true);
  readonly price = input(0);
  readonly special = input(false);
  readonly themeName = input('');
  readonly wear = output<WardrobeOption>();
}
