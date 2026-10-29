import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Avatar } from '../avatar/avatar';
import { AvatarDressingStore } from '../avatar/avatar-dressing-store';
import { WardrobeOption, previewOption } from '../avatar/avatar-wardrobe';
import { PiggyBank } from '../shop/piggy-bank';
import { FurnitureId } from './room-model';
import { furnitureGroups } from './room-content';
import { RoomItem } from './room-item';
import { SPOT_LABELS } from './room-scene';

/** Identifiant de la liste de dépôt du personnage (voir RoomScene). */
export const CHARACTER_DROP_LIST = 'room-character';

/**
 * Le contenu d'un meuble ouvert, présenté dans le décor du meuble : vêtements sur des cintres dans l'armoire, cases
 * dans les tiroirs, chapeaux accrochés, jouets dans le coffre, paysages sur le rebord de la fenêtre… Chaque meuble a sa
 * présentation ; toutes réutilisent la vignette RoomItem. Un appui pose la pièce ; on peut aussi la glisser sur le
 * personnage.
 */
@Component({
  selector: 'app-furniture-panel',
  imports: [CdkDrag, CdkDropList, MatIconModule, Avatar, PiggyBank, RoomItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"panel " + furniture()', role: 'region', '[attr.aria-label]': 'title()' },
  template: `
    <header class="head">
      <h2>{{ title() }}</h2>
      <button type="button" class="close" (click)="close.emit()" i18n-aria-label="@@room.close" aria-label="Fermer">
        <mat-icon>close</mat-icon>
      </button>
    </header>

    <div class="body">
      @if (furniture() === 'livre') {
        <ul class="ideas">
          @for (idea of store.ideas(); track $index) {
            <li>
              <button type="button" class="idea" (click)="store.applyIdea(idea.idea)">
                <app-avatar [config]="idea.config" [member]="store.member" [size]="64" [full]="true" [bare]="true" [round]="false" label="" />
                <span class="idea-title">{{ idea.title }}</span>
                <span class="idea-price">
                  @if (idea.price > 0) {
                    🪙 {{ idea.price }}
                  } @else {
                    <mat-icon>check_circle</mat-icon>
                  }
                </span>
              </button>
            </li>
          } @empty {
            <p class="empty" i18n="@@shop.filter.empty">Rien ici pour le moment.</p>
          }
        </ul>
      } @else if (furniture() === 'tirelire') {
        <div class="piggy"><app-piggy-bank [memberId]="store.member.id!" /></div>
      } @else {
        @if (furniture() === 'coiffeuse') {
          <!-- Gros plan sur le visage, dans le miroir -->
          <div class="mirror" aria-hidden="true">
            <app-avatar [config]="store.config()" [member]="store.member" [bare]="true" [round]="false" [size]="null" viewBox="46 18 108 135" label="" />
          </div>
        }
        @for (group of groups(); track group.id) {
          <section class="group" [class.colors]="group.kind === 'swatches'">
            <h3>{{ group.title }}</h3>
            <div
              class="shelf"
              [class.hanging]="furniture() === 'armoire'"
              [class.pegs]="furniture() === 'chapeaux'"
              cdkDropList
              cdkDropListSortingDisabled
              [id]="'room-' + group.id"
              [cdkDropListConnectedTo]="[dropList]"
              [cdkDropListEnterPredicate]="never"
            >
              @for (option of group.options; track option.key) {
                <div class="slot" cdkDrag [cdkDragData]="option" [cdkDragStartDelay]="dragDelay" cdkDragPreviewClass="room-drag-preview" (cdkDragStarted)="dragState.emit(true)" (cdkDragEnded)="dragState.emit(false)">
                  <app-room-item
                    [option]="option"
                    [config]="thumbs().get(option.key) ?? null"
                    [member]="store.member"
                    [viewBox]="group.viewBox ?? null"
                    [selected]="option.isSelected(store.config())"
                    [owned]="store.owned(option)"
                    [price]="store.price(option)"
                    [special]="!!option.theme && option.theme === store.activeTheme()"
                    [themeName]="store.themeName()"
                    (wear)="wear.emit($event)"
                  />
                </div>
              }
            </div>
          </section>
        } @empty {
          <p class="empty" i18n="@@shop.filter.empty">Rien ici pour le moment.</p>
        }
      }
    </div>
  `,
  styleUrl: './furniture-panel.scss',
})
export class FurniturePanel {
  readonly furniture = input.required<FurnitureId>();
  readonly wear = output<WardrobeOption>();
  readonly close = output<void>();
  /** Une affaire est (ou n'est plus) en train d'être glissée. */
  readonly dragState = output<boolean>();

  protected readonly store = inject(AvatarDressingStore);
  protected readonly dropList = CHARACTER_DROP_LIST;
  /** Souris : le glisser commence tout de suite. Doigt : après un court appui (un balayage rapide fait défiler). */
  protected readonly dragDelay = { touch: 180, mouse: 0 };
  /** Les vignettes ne se déposent pas entre elles : seul le personnage les accepte. */
  protected readonly never = () => false;

  protected readonly title = computed(() => SPOT_LABELS[this.furniture()]);
  protected readonly groups = computed(() => furnitureGroups(this.store, this.furniture()));

  /** Le personnage avec chaque pièce du meuble (on voit le résultat avant de choisir). */
  protected readonly thumbs = computed(() => {
    const config = this.store.config();
    return new Map(this.groups().flatMap((g) => g.options).map((o) => [o.key, previewOption(o, config)] as const));
  });
}
