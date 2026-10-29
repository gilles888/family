import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { map } from 'rxjs';
import { FamilyMemberDTO } from '../api-client';
import { BuyDialog, BuyDialogData } from '../shop/buy-dialog';
import { PiggyBank } from '../shop/piggy-bank';
import { DropZone, HATS, ACCESSORIES, ZONES } from './avatar-parts';
import { WARDROBE, WardrobeCategory, WardrobeOption } from './avatar-wardrobe';
import { Avatar } from './avatar';
import { AvatarDressingStore, DRESSING_MEMBER } from './avatar-dressing-store';

export interface AvatarEditorData {
  member: FamilyMemberDTO;
}

/** Ce qu'on glisse : une option de la garde-robe (vers le personnage) ou une pièce portée (vers la garde-robe). */
type DragData =
  | { kind: 'option'; option: WardrobeOption }
  | { kind: 'worn'; field: 'hat' | 'accessory'; zone: DropZone };

/** Souris : le glisser commence tout de suite. Doigt : après un court appui (un balayage rapide fait défiler). */
const DRAG_DELAY = { touch: 180, mouse: 0 };

/** Position CSS (en %) d'une zone du personnage. */
function zoneStyle(zone: DropZone): Record<string, string> {
  const [x, y, w, h] = ZONES[zone];
  return { left: `${x / 2}%`, top: `${y / 3}%`, width: `${w / 2}%`, height: `${h / 3}%` };
}

/** Réduction des animations demandée par le système. */
function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * « Mode simple » de l'habillage : un dialogue avec un grand aperçu, la garde-robe en onglets, vignettes et pastilles.
 * Deux façons de poser une pièce : tap sur l'option, ou glisser-déposer sur le personnage (CDK DragDrop : souris,
 * doigt et stylet) où elle s'aimante à sa zone. Le chapeau et l'accessoire portés se retirent en les glissant vers
 * la garde-robe (ou avec l'option « aucun »). Le glisser est un bonus : tout se fait aussi au tap et au clavier.
 * Toute la logique (essayage, achat, tenues de thème…) est dans AvatarDressingStore, partagé avec la chambre.
 * Se ferme avec le membre mis à jour si l'avatar est enregistré.
 */
@Component({
  selector: 'app-avatar-editor',
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    Avatar,
    PiggyBank,
  ],
  providers: [
    { provide: DRESSING_MEMBER, useFactory: () => inject<AvatarEditorData>(MAT_DIALOG_DATA).member },
    AvatarDressingStore,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-editor.html',
  styleUrls: ['./avatar-editor.scss', './avatar-editor-drag.scss', './avatar-editor-shop.scss'],
})
export class AvatarEditor {
  private readonly dialogRef = inject(MatDialogRef<AvatarEditor, FamilyMemberDTO>);
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(AvatarDressingStore);
  protected readonly member = this.store.member;

  private readonly preview = viewChild.required<ElementRef<HTMLElement>>('preview');

  // ---------- état et calculs partagés (voir AvatarDressingStore)
  protected readonly config = this.store.config;
  protected readonly saving = this.store.saving;
  protected readonly shop = this.store.shop;
  protected readonly isParent = this.store.isParent;
  protected readonly activeTheme = this.store.activeTheme;
  protected readonly themeName = this.store.themeName;
  protected readonly filter = this.store.filter;
  protected readonly filters = this.store.filters;
  protected readonly missing = this.store.missing;
  protected readonly totalPrice = this.store.totalPrice;
  protected readonly lacking = this.store.lacking;
  protected readonly saveIcon = this.store.saveIcon;
  protected readonly ideas = this.store.ideas;
  protected readonly themes = this.store.themes;
  protected readonly outfitTheme = this.store.outfitTheme;
  protected readonly outfitAuto = this.store.outfitAuto;
  protected readonly savedOutfit = this.store.savedOutfit;
  protected readonly savedConfig = this.store.savedConfig;
  protected readonly themeLabel = this.store.themeLabel;
  protected readonly worn = this.store.worn;
  protected readonly price = (option: WardrobeOption) => this.store.price(option);
  protected readonly owned = (option: WardrobeOption) => this.store.owned(option);
  protected readonly applyIdea = this.store.applyIdea.bind(this.store);
  protected readonly saveOutfit = this.store.saveOutfit.bind(this.store);
  protected readonly removeOutfit = this.store.removeOutfit.bind(this.store);
  protected readonly tryOutfit = this.store.tryOutfit.bind(this.store);
  protected readonly setOutfitAuto = this.store.setOutfitAuto.bind(this.store);
  protected readonly surprise = this.store.surprise.bind(this.store);

  // ---------- présentation : catégories, panneaux ouverts
  protected readonly categories = WARDROBE;
  protected readonly category = signal<WardrobeCategory>(WARDROBE[0]);
  protected readonly ideasOpen = signal(false);
  protected readonly outfitsOpen = signal(false);
  /** Garde-robe filtrée de l'onglet affiché. */
  protected readonly groups = computed(() => this.store.groupsOf(this.category()));

  constructor() {
    this.store.reactions.pipe(takeUntilDestroyed()).subscribe((reaction) => (reaction === 'pop' ? this.pop() : this.celebrateSurprise()));
  }

  // ---------- glisser-déposer
  protected readonly dragDelay = DRAG_DELAY;
  protected readonly zoneStyle = zoneStyle;

  /** Cadrage carré centré sur une zone (aperçu de la pièce qu'on retire). */
  protected zoneViewBox(zone: DropZone): string {
    const [x, y, w, h] = ZONES[zone];
    const side = Math.max(w, h) + 16;
    return `${x + w / 2 - side / 2} ${y + h / 2 - side / 2} ${side} ${side}`;
  }
  /** Pièce en cours de glisser (zone surlignée sur le personnage). */
  protected readonly dragged = signal<DragData | null>(null);
  protected readonly overStage = signal(false);
  /** Un « clic » suit parfois la fin d'un glisser : il ne doit pas appliquer l'option une seconde fois. */
  private lastDragEnd = 0;

  /** Personnage affiché : la pièce qu'on est en train de retirer n'est plus portée. */
  protected readonly shown = computed(() => {
    const dragged = this.dragged();
    return dragged?.kind === 'worn' ? { ...this.config(), [dragged.field]: 'none' } : this.config();
  });

  /** Ids des listes de la garde-robe (onglet affiché), reliées au personnage. */
  protected readonly groupListIds = computed(() =>
    this.category().groups.map((g) => `wardrobe-${g.id}`),
  );

  protected readonly wornLabels: Record<'hat' | 'accessory', string> = {
    hat: HATS[0].label,
    accessory: ACCESSORIES[0].label,
  };

  /** Le personnage n'accepte que les options de la garde-robe. */
  protected readonly acceptOption = (drag: CdkDrag<DragData>) => drag.data?.kind === 'option';
  /** La garde-robe n'accepte que les pièces portées (retrait). */
  protected readonly acceptWorn = (drag: CdkDrag<DragData>) => drag.data?.kind === 'worn';

  /** Config de chaque vignette : le personnage actuel avec cette option (on voit le résultat avant de choisir). */
  protected readonly thumbs = computed(() => {
    const config = this.config();
    return new Map(
      this.category()
        .groups.flatMap((g) => g.options)
        .map((o) => [o.key, o.apply(config)] as const),
    );
  });

  protected select(option: WardrobeOption): void {
    if (Date.now() - this.lastDragEnd < 350) {
      return;
    }
    this.store.wear(option);
  }

  protected dragStarted(data: DragData): void {
    this.dragged.set(data);
  }

  protected dragEnded(): void {
    this.dragged.set(null);
    this.overStage.set(false);
    this.lastDragEnd = Date.now();
  }

  /**
   * Option lâchée sur le personnage : elle s'aimante à sa zone (animation du CDK), puis s'applique.
   * Lâchée hors du personnage : elle revient dans la garde-robe, rien ne change.
   */
  protected dropOnStage(event: CdkDragDrop<unknown, unknown, DragData>): void {
    const data = event.item.data;
    // isPointerOverContainer : le CDK garde la dernière liste survolée, même si on lâche ailleurs ensuite
    if (
      data.kind === 'option' &&
      event.previousContainer !== event.container &&
      event.isPointerOverContainer
    ) {
      this.store.wear(data.option);
    }
  }

  /** Pièce portée lâchée dans la garde-robe : retirée. Lâchée ailleurs : elle revient sur le personnage. */
  protected dropInWardrobe(event: CdkDragDrop<unknown, unknown, DragData>): void {
    const data = event.item.data;
    if (
      data.kind === 'worn' &&
      event.previousContainer !== event.container &&
      event.isPointerOverContainer
    ) {
      this.store.remove(data.field);
    }
  }

  /** Fermer sans enregistrer le personnage : si les tenues de thème ont changé, la page doit quand même se rafraîchir. */
  protected cancel(): void {
    this.dialogRef.close(this.store.memberIfOutfitsChanged());
  }

  /** Enregistrer : directement si tout est possédé ; sinon un enfant achète (confirmation), un parent offre. */
  protected saveOrBuy(): void {
    this.store
      .saveOrBuy((articleIds, config) =>
        this.dialog
          .open<BuyDialog, BuyDialogData, boolean>(BuyDialog, {
            data: { member: this.member, config, articleIds },
            width: '420px',
            maxWidth: '95vw',
          })
          .afterClosed()
          .pipe(map((bought) => !!bought)),
      )
      .subscribe((member) => {
        // Petit rebond de joie, puis fermeture
        const done = () => this.dialogRef.close(member);
        const animation = this.animate(
          [
            { transform: 'translateY(0) scale(1)' },
            { transform: 'translateY(-18px) scale(1.06)' },
            { transform: 'translateY(0) scale(0.97)' },
            { transform: 'translateY(-6px) scale(1.02)' },
            { transform: 'translateY(0) scale(1)' },
          ],
          550,
        );
        if (animation) {
          animation.onfinish = done;
        } else {
          done();
        }
      });
  }

  private celebrateSurprise(): void {
    this.animate(
      [
        { transform: 'rotate(0) scale(1)' },
        { transform: 'rotate(-8deg) scale(0.92)' },
        { transform: 'rotate(6deg) scale(1.05)' },
        { transform: 'rotate(0) scale(1)' },
      ],
      450,
    );
  }

  /** Retour visuel immédiat quand une pièce est posée. */
  protected pop(): void {
    this.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
      220,
    );
  }

  private animate(keyframes: Keyframe[], duration: number): Animation | undefined {
    if (reducedMotion()) {
      return undefined;
    }
    return this.preview().nativeElement.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }
}
