import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FamilyMemberDTO } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { AvatarConfig } from '../avatar/avatar-config';
import { BACKGROUND_GRADIENTS } from '../avatar/avatar-parts';
import { SvgShapes } from '../shared/svg/svg-shapes';
import { ActiveTheme } from '../theme/active-theme';
import { SeasonParticles } from '../theme/season-particles';
import { FurnitureId, ROOM_H, ROOM_VIEWBOX, ROOM_W, RoomSpot, buildRoom, windowSeason } from './room-model';
import { RoomDefs } from './room-defs';

export type { FurnitureId, RoomSpot };

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

const SPOTS = Object.keys(SPOT_LABELS) as RoomSpot[];

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** Nuit : de 20 h à 7 h (la fenêtre montre la lune et les étoiles). */
const isNight = (d = new Date()) => d.getHours() >= 20 || d.getHours() < 7;

/**
 * La pièce : mur, parquet, meubles et personnage au milieu, en SVG (viewBox fixe, la scène s'adapte à l'écran). Les
 * meubles sont des vrais boutons posés par-dessus le dessin. Présentation seulement : ce qui s'ouvre, et ce que
 * contiennent les meubles, est décidé par l'écran qui l'héberge.
 */
@Component({
  selector: 'app-room-scene',
  imports: [Avatar, CdkDropList, SvgShapes, RoomDefs, SeasonParticles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="room"
      [style.--room-ratio]="ratio"
      [style.--px]="tilt().x"
      [style.--py]="tilt().y"
      (pointermove)="onPointer($event)"
      (pointerleave)="tilt.set({ x: 0, y: 0 })"
    >
      <svg class="art" [attr.viewBox]="viewBox" aria-hidden="true">
        <defs roomDefs></defs>
        <defs>
          @if (gradient(); as g) {
            <linearGradient id="room-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" [attr.stop-color]="g.from" />
              <stop offset="1" [attr.stop-color]="g.to" />
            </linearGradient>
          }
        </defs>
        @for (layer of model().layers; track $index) {
          <g [attr.transform]="layer.transform ?? null" [attr.clip-path]="layer.clip ? 'url(#' + layer.clip + ')' : null">
            <g
              [class]="layer.cls ?? ''"
              [class.open]="!!layer.opens && open() === layer.opens"
              [attr.filter]="layer.filter ? 'url(#' + layer.filter + ')' : null"
              [appShapes]="layer.shapes"
            ></g>
          </g>
        }
      </svg>
      <app-season-particles />

      <app-avatar
        class="character"
        [config]="config()"
        [member]="member()"
        [bare]="true"
        [full]="true"
        [round]="false"
        [size]="null"
        [label]="member().nom ?? ''"
        [style.left.%]="characterBox().left"
        [style.top.%]="characterBox().top"
        [style.width.%]="characterBox().width"
      />

      <!-- Zone de dépôt : une affaire glissée depuis un meuble s'enfile sur le personnage -->
      <div
        class="drop"
        id="room-character"
        cdkDropList
        cdkDropListSortingDisabled
        [class.targeted]="dragging()"
        [style.left.%]="characterBox().left"
        [style.top.%]="characterBox().top"
        [style.width.%]="characterBox().width"
        (cdkDropListDropped)="dropped.emit($event)"
      ></div>

      @for (spot of spots; track spot) {
        <button
          type="button"
          class="spot"
          [class.active]="open() === spot"
          [class.empty]="empty()[spot]"
          [class.object]="spot === 'de' || spot === 'livre'"
          [style.left.%]="box()[spot].left"
          [style.top.%]="box()[spot].top"
          [style.width.%]="box()[spot].width"
          [style.height.%]="box()[spot].height"
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
  /** Une affaire est en train d'être glissée (la zone du personnage s'allume). */
  readonly dragging = input(false);
  readonly pick = output<RoomSpot>();
  /** Une affaire a été lâchée sur le personnage. */
  readonly dropped = output<CdkDragDrop<unknown, unknown, unknown>>();

  protected readonly viewBox = ROOM_VIEWBOX;
  protected readonly ratio = ROOM_W / ROOM_H;
  protected readonly spots = SPOTS;
  protected readonly labels = SPOT_LABELS;
  protected readonly empty = computed(() => this.emptyFurniture());

  /** Parallaxe : inclinaison (-1…1) donnée par la souris, ou par le téléphone quand l'orientation est disponible sans demande. */
  protected readonly tilt = signal({ x: 0, y: 0 });
  private readonly reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor() {
    // iOS demande une autorisation (requestPermission) : sans elle on ne l'utilise pas ; ailleurs l'événement est libre
    const orientation = globalThis.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
    if (!this.reduced && orientation && typeof orientation.requestPermission !== 'function') {
      const onTilt = (e: DeviceOrientationEvent) => {
        if (e.gamma !== null && e.beta !== null) {
          this.tilt.set({ x: clamp(e.gamma / 25), y: clamp((e.beta - 45) / 25) });
        }
      };
      addEventListener('deviceorientation', onTilt);
      inject(DestroyRef).onDestroy(() => removeEventListener('deviceorientation', onTilt));
    }
  }

  /** Milieu d'un meuble, en fraction de la largeur de la pièce (pour le faire défiler au centre). */
  centerOf(spot: RoomSpot): number {
    const [x, , w] = this.model().spots[spot];
    return (x + w / 2) / ROOM_W;
  }

  protected onPointer(event: PointerEvent): void {
    if (this.reduced || event.pointerType !== 'mouse') {
      return;
    }
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tilt.set({ x: clamp(((event.clientX - r.left) / r.width) * 2 - 1), y: clamp(((event.clientY - r.top) / r.height) * 2 - 1) });
  }

  private readonly theme = inject(ActiveTheme).id;
  private readonly night = isNight();

  /** La pièce en volumes : ciel de la fenêtre (fond choisi), nuit, saison du thème. */
  protected readonly model = computed(() => buildRoom({ sky: this.skyFill(), night: this.night, season: windowSeason(this.theme()) }));

  /** Position des points cliquables en % de la pièce. */
  protected readonly box = computed(() => {
    const spots = this.model().spots;
    return Object.fromEntries(
      SPOTS.map((s) => {
        const [x, y, w, h] = spots[s];
        return [s, { left: (100 * x) / ROOM_W, top: (100 * y) / ROOM_H, width: (100 * w) / ROOM_W, height: (100 * h) / ROOM_H }];
      }),
    ) as Record<RoomSpot, { left: number; top: number; width: number; height: number }>;
  });

  protected readonly characterBox = computed(() => {
    const c = this.model().character;
    return { left: (100 * c.left) / ROOM_W, top: (100 * c.top) / ROOM_H, width: (100 * c.width) / ROOM_W };
  });

  protected readonly gradient = computed(() => BACKGROUND_GRADIENTS.find((g) => g.id === this.config().background));
  /** Ciel de la fenêtre : la couleur ou le dégradé du fond du personnage. */
  protected readonly skyFill = computed(() => (this.gradient() ? 'url(#room-sky)' : this.config().background));
}
