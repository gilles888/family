import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
import { FamilyMemberDTO, MembresService, TenuesService } from '../api-client';
import { AuthService } from '../auth/auth.service';
import { BuyDialog, BuyDialogData } from '../shop/buy-dialog';
import { PiggyBank } from '../shop/piggy-bank';
import { ShopService } from '../shop/shop.service';
import { ActiveTheme } from '../theme/active-theme';
import { seasonLabel } from '../theme/season-labels';
import { SEASON_IDS, SeasonId, toApiTheme } from '../theme/seasons';
import { AvatarConfig, defaultAvatar, normalizeAvatar, randomAvatar } from './avatar-config';
import { ACCESSORIES, DropZone, HATS, NONE, ZONES } from './avatar-parts';
import { WARDROBE, WardrobeCategory, WardrobeOption } from './avatar-wardrobe';
import { Avatar } from './avatar';
import { ARTICLE_FIELDS } from './article-info';
import { OUTFIT_IDEAS, OutfitIdea, applyIdea, ideaArticles, ideaTitle } from './avatar-ideas';

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
  return { left: `${x / 2}%`, top: `${y / 2}%`, width: `${w / 2}%`, height: `${h / 2}%` };
}

/** Réduction des animations demandée par le système. */
function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Éditeur de personnage (« poupée à habiller ») : grand aperçu, garde-robe en onglets, vignettes et pastilles.
 * Deux façons de poser une pièce : tap sur l'option, ou glisser-déposer sur le personnage (CDK DragDrop : souris,
 * doigt et stylet) où elle s'aimante à sa zone. Le chapeau et l'accessoire portés se retirent en les glissant vers
 * la garde-robe (ou avec l'option « aucun »). Le glisser est un bonus : tout se fait aussi au tap et au clavier.
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-editor.html',
  styleUrls: ['./avatar-editor.scss', './avatar-editor-drag.scss', './avatar-editor-shop.scss'],
})
export class AvatarEditor {
  private readonly api = inject(MembresService);
  private readonly dialogRef = inject(MatDialogRef<AvatarEditor, FamilyMemberDTO>);
  protected readonly member = inject<AvatarEditorData>(MAT_DIALOG_DATA).member;

  private readonly preview = viewChild.required<ElementRef<HTMLElement>>('preview');

  protected readonly categories = WARDROBE;
  protected readonly category = signal<WardrobeCategory>(WARDROBE[0]);
  protected readonly config = signal<AvatarConfig>(
    normalizeAvatar(
      this.member.avatarConfig,
      defaultAvatar(this.member.id ?? 0, this.member.couleur),
    ),
  );
  protected readonly saving = signal(false);

  // ---------- boutique : articles possédés, prix, filtres
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly tenuesApi = inject(TenuesService);
  private readonly shopService = inject(ShopService);
  protected readonly shop = this.shopService.of(this.member.id!);
  protected readonly isParent = this.auth.isParent;
  /** Thème du moment (les pièces de ce thème passent en tête). */
  protected readonly activeTheme = inject(ActiveTheme).id;
  protected readonly filter = signal<'all' | 'mine' | 'shop' | 'theme'>('all');
  protected readonly filters = [
    { id: 'all' as const, label: $localize`:@@shop.filter.all:Tout`, icon: 'apps' },
    { id: 'mine' as const, label: $localize`:@@shop.filter.mine:À moi`, icon: 'check_circle' },
    { id: 'shop' as const, label: $localize`:@@shop.filter.shop:Boutique`, icon: 'storefront' },
    { id: 'theme' as const, label: $localize`:@@shop.filter.theme:Spécial thème`, icon: 'auto_awesome' },
  ];

  /** Nom du thème du moment, pour le badge « Spécial … » (rien en dehors d'un thème). */
  protected readonly themeName = computed(() => (this.activeTheme() === 'neutre' ? '' : seasonLabel(this.activeTheme())));

  /** Prix d'une option de la garde-robe (0 = gratuite, couleur ou « aucun »). */
  protected price(option: WardrobeOption): number {
    return option.articleId ? this.shopService.price(option.articleId) : 0;
  }

  protected owned(option: WardrobeOption): boolean {
    return !option.articleId || this.shop.owns(option.articleId);
  }

  /** Garde-robe filtrée : les pièces du thème du moment d'abord, « aucun » toujours en tête. */
  protected readonly groups = computed(() => {
    const filter = this.filter();
    const theme = this.activeTheme();
    this.shop.wallet(); // recalcul après un achat
    return this.category()
      .groups.map((group) => {
        const keep = group.options.filter((o) => {
          if (o.none || filter === 'all') {
            return true;
          }
          if (filter === 'mine') {
            return this.owned(o);
          }
          if (filter === 'shop') {
            return !!o.articleId && !this.owned(o);
          }
          return !!o.theme && o.theme === theme;
        });
        const rank = (o: WardrobeOption) => (o.none ? 0 : o.theme && o.theme === theme ? 1 : 2);
        const options = keep
          .map((o, i) => ({ o, i }))
          .sort((a, b) => rank(a.o) - rank(b.o) || a.i - b.i)
          .map((x) => x.o);
        return { ...group, options };
      })
      .filter((group) => filter === 'all' || group.options.some((o) => !o.none));
  });

  /** Articles payants portés qu'on ne possède pas encore (essayés dans la cabine d'essayage). */
  protected readonly missing = computed(() => {
    this.shop.wallet();
    const config = this.config() as unknown as Record<string, string | undefined>;
    const ids = ARTICLE_FIELDS.map((f) => config[f]).filter(
      (id): id is string => !!id && id !== NONE && this.shopService.price(id) > 0 && !this.shop.owns(id),
    );
    return [...new Set(ids)];
  });
  protected readonly totalPrice = computed(() => this.missing().reduce((sum, id) => sum + this.shopService.price(id), 0));
  protected readonly saveIcon = computed(() =>
    this.missing().length === 0 ? 'check' : this.isParent() ? 'card_giftcard' : this.lacking() === 0 ? 'shopping_cart' : 'lock',
  );
  protected readonly lacking = computed(() => Math.max(0, this.totalPrice() - this.shop.pieces()));

  // ---------- idées de tenues du thème du moment
  protected readonly ideasOpen = signal(false);
  protected readonly ideas = computed(() => {
    const theme = this.activeTheme();
    this.shop.wallet();
    const config = this.config();
    return (theme === 'neutre' ? [] : (OUTFIT_IDEAS[theme] ?? [])).map((idea) => {
      const missing = ideaArticles(idea).filter((id) => this.shopService.price(id) > 0 && !this.shop.owns(id));
      return { idea, title: ideaTitle(idea), config: applyIdea(config, idea), price: missing.reduce((s, id) => s + this.shopService.price(id), 0) };
    });
  });

  // ---------- tenues de thème enregistrées
  protected readonly outfitsOpen = signal(false);
  protected readonly themes = SEASON_IDS.map((id) => ({ id, label: seasonLabel(id) }));
  protected readonly outfitTheme = signal<SeasonId>(this.activeTheme() === 'neutre' ? 'halloween' : (this.activeTheme() as SeasonId));
  protected readonly outfits = signal<Record<string, Record<string, unknown>>>(this.member.tenues ?? {});
  protected readonly outfitAuto = signal(this.member.tenueAuto !== false);
  protected readonly savedOutfit = computed(() => this.outfits()[toApiTheme(this.outfitTheme())] ?? null);
  protected readonly savedConfig = computed(() => {
    const saved = this.savedOutfit();
    return saved ? normalizeAvatar(saved, this.config()) : null;
  });
  protected readonly themeLabel = computed(() => seasonLabel(this.outfitTheme()));
  private outfitsChanged = false;

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
    return dragged?.kind === 'worn' ? { ...this.config(), [dragged.field]: NONE } : this.config();
  });

  /** Pièces retirables en les glissant : chapeau et accessoire portés, chacun sur sa zone. */
  protected readonly worn = computed<Extract<DragData, { kind: 'worn' }>[]>(() => {
    const config = this.config();
    const worn: Extract<DragData, { kind: 'worn' }>[] = [];
    if (config.hat !== NONE) {
      worn.push({ kind: 'worn', field: 'hat', zone: 'hat' });
    }
    const accessory = ACCESSORIES.find((a) => a.id === config.accessory);
    if (accessory && accessory.id !== NONE) {
      worn.push({ kind: 'worn', field: 'accessory', zone: accessory.zone ?? 'face' });
    }
    return worn;
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
    this.config.update((c) => option.apply(c));
    this.pop();
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
      this.config.update((c) => data.option.apply(c));
      this.pop();
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
      this.config.update((c) => ({ ...c, [data.field]: NONE }));
      this.pop();
    }
  }

  protected surprise(): void {
    this.config.set(randomAvatar());
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

  protected applyIdea(idea: OutfitIdea): void {
    this.config.update((c) => applyIdea(c, idea));
    this.pop();
  }

  protected saveOutfit(): void {
    const theme = toApiTheme(this.outfitTheme()) as Parameters<TenuesService['updateTenue']>[1];
    this.tenuesApi.updateTenue(this.member.id!, theme, { ...this.config() }).subscribe((outfits) => {
      this.outfits.set(outfits);
      this.outfitsChanged = true;
    });
  }

  protected removeOutfit(): void {
    const theme = toApiTheme(this.outfitTheme()) as Parameters<TenuesService['deleteTenue']>[1];
    this.tenuesApi.deleteTenue(this.member.id!, theme).subscribe((outfits) => {
      this.outfits.set(outfits);
      this.outfitsChanged = true;
    });
  }

  protected tryOutfit(): void {
    const saved = this.savedOutfit();
    if (saved) {
      this.config.set(normalizeAvatar(saved, this.config()));
      this.pop();
    }
  }

  protected setOutfitAuto(actif: boolean): void {
    this.outfitAuto.set(actif);
    this.tenuesApi.updateTenueAuto(this.member.id!, { actif }).subscribe({
      next: () => (this.outfitsChanged = true),
      error: () => this.outfitAuto.set(!actif),
    });
  }

  /** Fermer sans enregistrer le personnage : si les tenues de thème ont changé, la page doit quand même se rafraîchir. */
  protected cancel(): void {
    this.dialogRef.close(this.outfitsChanged ? { ...this.member, tenues: this.outfits(), tenueAuto: this.outfitAuto() } : undefined);
  }

  /** Enregistrer : directement si tout est possédé ; sinon un enfant achète (confirmation), un parent offre. */
  protected saveOrBuy(): void {
    const missing = this.missing();
    if (missing.length === 0) {
      this.save();
    } else if (this.isParent()) {
      this.saving.set(true);
      const gift = (index: number): void => {
        if (index >= missing.length) {
          this.save();
          return;
        }
        this.shop.gift(missing[index]).subscribe({ next: () => gift(index + 1), error: () => this.saving.set(false) });
      };
      gift(0);
    } else if (this.lacking() === 0) {
      this.dialog
        .open<BuyDialog, BuyDialogData, boolean>(BuyDialog, {
          data: { member: this.member, config: this.config(), articleIds: missing },
          width: '420px',
          maxWidth: '95vw',
        })
        .afterClosed()
        .subscribe((bought) => bought && this.save());
    }
  }

  protected save(): void {
    this.saving.set(true);
    this.api.updateAvatarMembre(this.member.id!, { ...this.config() }).subscribe({
      next: (saved) => {
        const member = { ...saved, tenues: this.outfits(), tenueAuto: this.outfitAuto() };
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
      },
      error: () => this.saving.set(false), // message affiché par l'intercepteur
    });
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
