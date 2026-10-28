import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FamilyMemberDTO } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { AvatarConfig } from '../avatar/avatar-config';
import { BACKGROUND_GRADIENTS } from '../avatar/avatar-parts';
import { SvgShapes } from '../shared/svg/svg-shapes';
import {
  ARMOIRE_BODY, ARMOIRE_DOOR_LEFT, ARMOIRE_DOOR_RIGHT, ARMOIRE_INSIDE, BOOK, CHARACTER, CHEST_BODY, CHEST_LID, COMMODE_BODY,
  COMMODE_DRAWERS, CURTAIN_LEFT, CURTAIN_RIGHT, CURTAIN_ROD, DICE, FLOOR, FURNITURE_RECT, FurnitureId, HAT_RACK, LEGS, MIRROR,
  PIG, ROOM_H, ROOM_VIEWBOX, ROOM_W, RUG, SHADOW, SHELF, SHOP_DOOR, SHOP_LIGHT, VANITY, WALL, WINDOW_FRAME, WINDOW_SKY_RECT,
} from './room-art';

/** Un point cliquable de la pièce : un meuble, ou un objet (dé, livre). */
export type RoomSpot = FurnitureId | 'de' | 'livre';

/** Libellés des points cliquables, lus par les lecteurs d'écran. */
export const SPOT_LABELS: Record<RoomSpot, string> = {
  armoire: $localize`:@@room.armoire:Armoire : tenues et déguisements`,
  commode: $localize`:@@room.commode:Commode : accessoires, maquillage et dos`,
  chapeaux: $localize`:@@room.chapeaux:Étagère : chapeaux`,
  coiffeuse: $localize`:@@room.coiffeuse:Coiffeuse : coiffure, visage et yeux`,
  coffre: $localize`:@@room.coffre:Coffre à jouets : objets`,
  fenetre: $localize`:@@room.fenetre:Fenêtre : le paysage du fond`,
  tirelire: $localize`:@@room.tirelire:Tirelire : étoiles et pièces`,
  boutique: $localize`:@@room.boutique:Boutique : articles à acheter`,
  de: $localize`:@@room.de:Surprise !`,
  livre: $localize`:@@room.livre:Idées de thème`,
};

const SPOTS = Object.keys(FURNITURE_RECT) as RoomSpot[];

/**
 * La pièce : mur, parquet, meubles et personnage au milieu, en SVG (viewBox fixe, la scène s'adapte à l'écran). Les
 * meubles sont des vrais boutons posés par-dessus le dessin. Présentation seulement : ce qui s'ouvre, et ce que
 * contiennent les meubles, est décidé par l'écran qui l'héberge.
 */
@Component({
  selector: 'app-room-scene',
  imports: [Avatar, SvgShapes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="room" [style.--room-ratio]="ratio">
      <svg class="art" [attr.viewBox]="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          @if (gradient(); as g) {
            <linearGradient id="room-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" [attr.stop-color]="g.from" />
              <stop offset="1" [attr.stop-color]="g.to" />
            </linearGradient>
          }
        </defs>
        <g [appShapes]="wall"></g>
        <g [appShapes]="floor"></g>
        <g [appShapes]="rug"></g>

        <!-- Fenêtre : le ciel est le fond choisi pour le personnage -->
        <rect [attr.x]="sky[0]" [attr.y]="sky[1]" [attr.width]="sky[2]" [attr.height]="sky[3]" [attr.fill]="skyFill()" />
        <g class="scenery" [class.hidden]="!!open()"></g>
        <g [appShapes]="curtainRod"></g>
        <g class="curtain left" [class.open]="open() === 'fenetre'" [appShapes]="curtainLeft"></g>
        <g class="curtain right" [class.open]="open() === 'fenetre'" [appShapes]="curtainRight"></g>
        <g [appShapes]="windowFrame"></g>

        <!-- Armoire -->
        <g [appShapes]="armoireBody"></g>
        <g [appShapes]="armoireInside"></g>
        <g class="door door-left" [class.open]="open() === 'armoire'" [appShapes]="armoireDoorLeft"></g>
        <g class="door door-right" [class.open]="open() === 'armoire'" [appShapes]="armoireDoorRight"></g>

        <!-- Étagère à chapeaux, commode et dé -->
        <g class="rack" [class.lift]="open() === 'chapeaux'" [appShapes]="hatRack"></g>
        <g [appShapes]="commodeBody"></g>
        @for (drawer of commodeDrawers; track $index) {
          <g class="drawer" [class.open]="open() === 'commode' && $index === 1" [appShapes]="drawer"></g>
        }
        <g class="dice" [appShapes]="dice"></g>

        <!-- Côté droit : étagère (tirelire, livre), coiffeuse, porte de la boutique, coffre -->
        <g [appShapes]="shelf"></g>
        <g class="pig" [class.hop]="open() === 'tirelire'" [appShapes]="pig"></g>
        <g [appShapes]="book"></g>
        <g [appShapes]="mirror"></g>
        <g [appShapes]="vanity"></g>
        <g [appShapes]="shopDoor"></g>
        <g class="shop-light" [class.open]="open() === 'boutique'" [appShapes]="shopLight"></g>
        <g [appShapes]="chestBody"></g>
        <g class="lid" [class.open]="open() === 'coffre'" [appShapes]="chestLid"></g>

        <g [appShapes]="shadow"></g>
        <g [appShapes]="legs"></g>
      </svg>

      <app-avatar
        class="character"
        [config]="config()"
        [member]="member()"
        [bare]="true"
        [round]="false"
        [size]="null"
        [label]="member().nom ?? ''"
        [style.left.%]="characterBox.left"
        [style.top.%]="characterBox.top"
        [style.width.%]="characterBox.width"
      />

      @for (spot of spots; track spot) {
        <button
          type="button"
          class="spot"
          [class.active]="open() === spot"
          [class.empty]="empty()[spot]"
          [class.object]="spot === 'de' || spot === 'livre'"
          [style.left.%]="box[spot].left"
          [style.top.%]="box[spot].top"
          [style.width.%]="box[spot].width"
          [style.height.%]="box[spot].height"
          [attr.aria-label]="labels[spot]"
          [attr.aria-expanded]="spot === 'de' || spot === 'livre' ? null : open() === spot"
          [attr.aria-disabled]="empty()[spot] ? 'true' : null"
          [title]="labels[spot]"
          (click)="pick.emit(spot)"
        ></button>
      }
    </div>
  `,
  styleUrl: './room-scene.scss',
})
export class RoomScene {
  readonly config = input.required<AvatarConfig>();
  readonly member = input.required<FamilyMemberDTO>();
  /** Meuble ouvert (un seul à la fois). */
  readonly open = input<FurnitureId | null>(null);
  /** Meubles vides : fermés et grisés. */
  readonly emptyFurniture = input<Partial<Record<RoomSpot, boolean>>>({});
  readonly pick = output<RoomSpot>();

  protected readonly viewBox = ROOM_VIEWBOX;
  protected readonly ratio = ROOM_W / ROOM_H;
  protected readonly spots = SPOTS;
  protected readonly labels = SPOT_LABELS;
  protected readonly empty = computed(() => this.emptyFurniture());

  protected readonly wall = WALL;
  protected readonly floor = FLOOR;
  protected readonly rug = RUG;
  protected readonly shadow = SHADOW;
  protected readonly legs = LEGS;
  protected readonly sky = WINDOW_SKY_RECT;
  protected readonly windowFrame = WINDOW_FRAME;
  protected readonly curtainLeft = CURTAIN_LEFT;
  protected readonly curtainRight = CURTAIN_RIGHT;
  protected readonly curtainRod = CURTAIN_ROD;
  protected readonly armoireBody = ARMOIRE_BODY;
  protected readonly armoireInside = ARMOIRE_INSIDE;
  protected readonly armoireDoorLeft = ARMOIRE_DOOR_LEFT;
  protected readonly armoireDoorRight = ARMOIRE_DOOR_RIGHT;
  protected readonly hatRack = HAT_RACK;
  protected readonly commodeBody = COMMODE_BODY;
  protected readonly commodeDrawers = COMMODE_DRAWERS;
  protected readonly dice = DICE;
  protected readonly shelf = SHELF;
  protected readonly pig = PIG;
  protected readonly book = BOOK;
  protected readonly mirror = MIRROR;
  protected readonly vanity = VANITY;
  protected readonly shopDoor = SHOP_DOOR;
  protected readonly shopLight = SHOP_LIGHT;
  protected readonly chestBody = CHEST_BODY;
  protected readonly chestLid = CHEST_LID;

  /** Position des points cliquables en % de la pièce. */
  protected readonly box = Object.fromEntries(
    SPOTS.map((s) => {
      const [x, y, w, h] = FURNITURE_RECT[s];
      return [s, { left: (100 * x) / ROOM_W, top: (100 * y) / ROOM_H, width: (100 * w) / ROOM_W, height: (100 * h) / ROOM_H }];
    }),
  ) as Record<RoomSpot, { left: number; top: number; width: number; height: number }>;

  protected readonly characterBox = {
    left: (100 * CHARACTER.x) / ROOM_W,
    top: (100 * CHARACTER.y) / ROOM_H,
    width: (100 * CHARACTER.size) / ROOM_W,
  };

  protected readonly gradient = computed(() => BACKGROUND_GRADIENTS.find((g) => g.id === this.config().background));
  /** Ciel de la fenêtre : la couleur ou le dégradé du fond du personnage. */
  protected readonly skyFill = computed(() => (this.gradient() ? 'url(#room-sky)' : this.config().background));
}
