import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { FamilyMemberDTO } from '../api-client';
import { AuthService } from '../auth/auth.service';
import { AvatarDressingStore, DRESSING_MEMBER } from '../avatar/avatar-dressing-store';
import { AvatarEditor, AvatarEditorData } from '../avatar/avatar-editor';
import { BuyDialog, BuyDialogData } from '../shop/buy-dialog';
import { NotificationService } from '../shared/notification.service';
import { furnitureCount } from './room-content';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { findArticle } from '../avatar/article-info';
import { WardrobeOption } from '../avatar/avatar-wardrobe';
import { FURNITURE_RECT, FurnitureId } from './room-art';
import { FurniturePanel } from './furniture-panel';
import { RoomScene, RoomSpot } from './room-scene';

/** Meubles qui s'ouvrent (le dé et le livre sont des objets). */
const FURNITURE: FurnitureId[] = ['armoire', 'commode', 'chapeaux', 'coiffeuse', 'coffre', 'fenetre', 'tirelire', 'boutique'];

/**
 * « Ma chambre » : l'habillage du personnage sous forme de pièce interactive. Toute la logique est dans
 * AvatarDressingStore (le même que celui du « mode simple ») ; cet écran ne fait que la présenter.
 */
@Component({
  selector: 'app-room-view',
  imports: [MatButtonModule, MatIconModule, FurniturePanel, RoomScene],
  providers: [{ provide: DRESSING_MEMBER, useFactory: () => inject(ActivatedRoute).snapshot.data['member'] }, AvatarDressingStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    <header class="top">
      <button type="button" matButton="tonal" class="back" (click)="back()">
        <mat-icon>arrow_back</mat-icon>
        <ng-container i18n="@@room.back">Retour</ng-container>
      </button>
      <h1 class="title" i18n="@@room.title">La chambre de {{ member.nom }}</h1>
      <span class="wallet" aria-live="polite">
        <span>⭐ {{ store.shop.stars() }}</span>
        <span>🪙 {{ store.shop.pieces() }}</span>
      </span>
      <button type="button" matButton class="simple" (click)="openSimple()">
        <mat-icon>tune</mat-icon>
        <ng-container i18n="@@room.simpleMode">Mode simple</ng-container>
      </button>
    </header>

    <div class="stage" [class.has-panel]="!!open()">
      <app-room-scene
        [config]="store.config()"
        [member]="member"
        [open]="open()"
        [emptyFurniture]="emptyFurniture()"
        [dragging]="dragging()"
        (pick)="pick($event)"
        (dropped)="dropped($event)"
      />

      @if (store.worn().length) {
        <div class="worn">
          <button type="button" class="worn-button" (click)="wornOpen.set(!wornOpen())" [attr.aria-expanded]="wornOpen()">
            <mat-icon>checkroom</mat-icon>
            <ng-container i18n="@@room.remove">Enlever…</ng-container>
          </button>
          @if (wornOpen()) {
            <ul class="worn-menu">
              @for (w of store.worn(); track w.field) {
                <li>
                  <button type="button" (click)="removeWorn(w.field)">
                    <mat-icon>close</mat-icon>
                    <ng-container i18n="@@room.removeOne">Enlever : {{ wornLabel(w.field) }}</ng-container>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }

      @if (open(); as furniture) {
        <app-furniture-panel
          class="side"
          [class.left]="onLeft(furniture)"
          [furniture]="furniture"
          (wear)="wear($event)"
          (close)="open.set(null)"
          (dragState)="dragging.set($event)"
        />
      }
    </div>

    <footer class="bottom">
      <button type="button" matButton="filled" class="save" (click)="saveOrBuy()" [disabled]="store.saving() || (!store.isParent() && store.lacking() > 0)">
        <mat-icon>{{ store.saveIcon() }}</mat-icon>
        @if (store.missing().length === 0) {
          <ng-container i18n="@@common.save">Enregistrer</ng-container>
        } @else if (store.isParent()) {
          <ng-container i18n="@@shop.giftAndSave">Offrir et enregistrer</ng-container>
        } @else if (store.lacking() === 0) {
          <ng-container i18n="@@shop.buyFor">Acheter pour {{ store.totalPrice() }} 🪙</ng-container>
        } @else {
          <ng-container i18n="@@shop.lacking">Il te manque {{ store.lacking() }} 🪙</ng-container>
        }
      </button>
    </footer>
  `,
  styleUrl: './room-view.scss',
})
export class RoomView {
  protected readonly store = inject(AvatarDressingStore);
  protected readonly member = this.store.member;
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  /** Meuble ouvert (un seul à la fois). */
  protected readonly open = signal<FurnitureId | null>(null);

  /** Meubles sans rien dedans : grisés et fermés. */
  protected readonly emptyFurniture = computed(() => {
    const empty: Partial<Record<RoomSpot, boolean>> = {};
    for (const id of FURNITURE) {
      empty[id] = furnitureCount(this.store, id) === 0;
    }
    empty.livre = this.store.ideas().length === 0;
    return empty;
  });

  /** Une affaire est en train d'être glissée. */
  protected readonly dragging = signal(false);
  protected readonly wornOpen = signal(false);

  /** Le panneau s'ouvre du côté du meuble : à gauche pour ceux de gauche, sinon à droite (le personnage reste visible). */
  protected onLeft(id: FurnitureId): boolean {
    const [x, , w] = FURNITURE_RECT[id];
    // la fenêtre est au milieu : le panneau passe à gauche pour qu'on voie le paysage changer
    return id === 'fenetre' || x + w / 2 < 400;
  }

  protected wear(option: WardrobeOption): void {
    this.store.wear(option);
  }

  /** Affaire lâchée sur le personnage : elle s'enfile. */
  protected dropped(event: CdkDragDrop<unknown, unknown, unknown>): void {
    const option = event.item.data as WardrobeOption | undefined;
    if (option && event.previousContainer !== event.container && event.isPointerOverContainer) {
      this.store.wear(option);
    }
  }

  protected removeWorn(field: 'hat' | 'accessory'): void {
    this.store.remove(field);
    this.wornOpen.set(false);
  }

  protected wornLabel(field: 'hat' | 'accessory'): string {
    return findArticle(this.store.config()[field])?.label ?? '';
  }

  /** Échap ferme le meuble ouvert (et le menu « Enlever »). */
  protected onEscape(): void {
    if (this.wornOpen()) {
      this.wornOpen.set(false);
    } else if (this.open()) {
      this.open.set(null);
    }
  }

  protected pick(spot: RoomSpot): void {
    if (spot === 'de') {
      this.store.surprise();
    } else if (spot === 'livre') {
      // les idées de thème s'ouvrent à l'étape suivante
    } else if (!this.emptyFurniture()[spot]) {
      this.open.update((current) => (current === spot ? null : spot));
    }
  }

  protected back(): void {
    void this.router.navigateByUrl(this.auth.isParent() ? '/membres' : '/routines');
  }

  /** Mode simple : l'ancien éditeur en dialogue, avec le même personnage en cours. */
  protected openSimple(): void {
    this.dialog
      .open<AvatarEditor, AvatarEditorData, FamilyMemberDTO>(AvatarEditor, {
        data: { member: { ...this.member, avatarConfig: { ...this.store.config() }, tenues: this.store.outfits(), tenueAuto: this.store.outfitAuto() } },
        width: '960px',
        maxWidth: '100vw',
        height: '720px',
        maxHeight: '100dvh',
        panelClass: 'avatar-editor-panel',
        autoFocus: 'dialog',
      })
      .afterClosed()
      .subscribe((saved) => saved && this.store.adopt(saved));
  }

  protected saveOrBuy(): void {
    this.store
      .saveOrBuy((articleIds, config) =>
        this.dialog
          .open<BuyDialog, BuyDialogData, boolean>(BuyDialog, { data: { member: this.member, config, articleIds }, width: '420px', maxWidth: '95vw' })
          .afterClosed()
          .pipe(map((bought) => !!bought)),
      )
      .subscribe((saved) => {
        this.store.saving.set(false);
        this.store.adopt(saved);
        this.notifications.success($localize`:@@room.saved:Personnage enregistré.`);
      });
  }
}

