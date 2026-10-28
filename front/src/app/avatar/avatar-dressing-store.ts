import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { Observable, Subject, map, of, tap } from 'rxjs';
import { FamilyMemberDTO, MembresService, TenuesService } from '../api-client';
import { AuthService } from '../auth/auth.service';
import { ShopService } from '../shop/shop.service';
import { ActiveTheme } from '../theme/active-theme';
import { seasonLabel } from '../theme/season-labels';
import { SEASON_IDS, SeasonId, toApiTheme } from '../theme/seasons';
import { ARTICLE_FIELDS } from './article-info';
import { AvatarConfig, defaultAvatar, normalizeAvatar, randomAvatar } from './avatar-config';
import { OUTFIT_IDEAS, OutfitIdea, applyIdea, ideaArticles, ideaTitle } from './avatar-ideas';
import { ACCESSORIES, DropZone, NONE } from './avatar-parts';
import { WardrobeCategory, WardrobeGroup, WardrobeOption } from './avatar-wardrobe';

/** Le membre dont on habille le personnage : fourni par l'écran qui héberge le store. */
export const DRESSING_MEMBER = new InjectionToken<FamilyMemberDTO>('DRESSING_MEMBER');

export type ShopFilter = 'all' | 'mine' | 'shop' | 'theme';

/** Pièce portée qu'on peut retirer (chapeau, accessoire), avec la zone du personnage où elle se pose. */
export interface WornPiece {
  kind: 'worn';
  field: 'hat' | 'accessory';
  zone: DropZone;
}

/** Réaction à montrer sur le personnage : le store la signale, l'écran l'anime. */
export type DressingReaction = 'pop' | 'surprise';

/**
 * Moteur de l'habillage d'un personnage, sans aucune présentation : config en cours, essayage, articles manquants,
 * achat, enregistrement, tenues de thème, surprise, idées de thème. L'éditeur en dialogue et la chambre l'utilisent.
 * À fournir au niveau du composant (`providers: [AvatarDressingStore]`) avec DRESSING_MEMBER.
 */
@Injectable()
export class AvatarDressingStore {
  readonly member = inject(DRESSING_MEMBER);
  private readonly api = inject(MembresService);
  private readonly tenuesApi = inject(TenuesService);
  private readonly auth = inject(AuthService);
  private readonly shopService = inject(ShopService);

  readonly shop = this.shopService.of(this.member.id!);

  constructor() {
    // porte-monnaie, articles possédés et catalogue (prix) : nécessaires à tout l'habillage
    this.shop.load().subscribe({ error: () => undefined });
  }
  readonly isParent = this.auth.isParent;
  /** Thème du moment (les pièces de ce thème passent en tête). */
  readonly activeTheme = inject(ActiveTheme).id;
  /** Nom du thème du moment, pour le badge « Spécial … » (rien en dehors d'un thème). */
  readonly themeName = computed(() => (this.activeTheme() === 'neutre' ? '' : seasonLabel(this.activeTheme())));

  /** Réactions à animer (pose d'une pièce, « Surprise ! »). */
  readonly reactions = new Subject<DressingReaction>();

  // ---------- personnage en cours d'essayage
  readonly config = signal<AvatarConfig>(normalizeAvatar(this.member.avatarConfig, defaultAvatar(this.member.id ?? 0, this.member.couleur)));
  readonly saving = signal(false);

  /** Pose une option de la garde-robe (tap ou dépôt). */
  wear(option: WardrobeOption): void {
    this.config.update((c) => option.apply(c));
    this.reactions.next('pop');
  }

  /** Retire le chapeau ou l'accessoire porté. */
  remove(field: WornPiece['field']): void {
    this.config.update((c) => ({ ...c, [field]: NONE }));
    this.reactions.next('pop');
  }

  /** Pièces retirables : chapeau et accessoire portés, chacun sur sa zone. */
  readonly worn = computed<WornPiece[]>(() => {
    const config = this.config();
    const worn: WornPiece[] = [];
    if (config.hat !== NONE) {
      worn.push({ kind: 'worn', field: 'hat', zone: 'hat' });
    }
    const accessory = ACCESSORIES.find((a) => a.id === config.accessory);
    if (accessory && accessory.id !== NONE) {
      worn.push({ kind: 'worn', field: 'accessory', zone: accessory.zone ?? 'face' });
    }
    return worn;
  });

  surprise(): void {
    this.config.set(randomAvatar());
    this.reactions.next('surprise');
  }

  // ---------- boutique : prix, possession, filtres
  readonly filter = signal<ShopFilter>('all');
  readonly filters = [
    { id: 'all' as const, label: $localize`:@@shop.filter.all:Tout`, icon: 'apps' },
    { id: 'mine' as const, label: $localize`:@@shop.filter.mine:À moi`, icon: 'check_circle' },
    { id: 'shop' as const, label: $localize`:@@shop.filter.shop:Boutique`, icon: 'storefront' },
    { id: 'theme' as const, label: $localize`:@@shop.filter.theme:Spécial thème`, icon: 'auto_awesome' },
  ];

  /** Prix d'une option de la garde-robe (0 = gratuite, couleur ou « aucun »). */
  price(option: WardrobeOption): number {
    return option.articleId ? this.shopService.price(option.articleId) : 0;
  }

  owned(option: WardrobeOption): boolean {
    return !option.articleId || this.shop.owns(option.articleId);
  }

  /** Groupes d'une catégorie, filtrés : les pièces du thème du moment d'abord, « aucun » toujours en tête. */
  groupsOf(category: WardrobeCategory, filterOverride?: ShopFilter): WardrobeGroup[] {
    const filter = filterOverride ?? this.filter();
    const theme = this.activeTheme();
    this.shop.wallet(); // recalcul après un achat
    return category.groups
      .map((group) => {
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
  }

  /** Articles payants portés qu'on ne possède pas encore (essayés dans la cabine d'essayage). */
  readonly missing = computed(() => {
    this.shop.wallet();
    const config = this.config() as unknown as Record<string, string | undefined>;
    const ids = ARTICLE_FIELDS.map((f) => config[f]).filter(
      (id): id is string => !!id && id !== NONE && this.shopService.price(id) > 0 && !this.shop.owns(id),
    );
    return [...new Set(ids)];
  });
  readonly totalPrice = computed(() => this.missing().reduce((sum, id) => sum + this.shopService.price(id), 0));
  readonly lacking = computed(() => Math.max(0, this.totalPrice() - this.shop.pieces()));
  readonly saveIcon = computed(() =>
    this.missing().length === 0 ? 'check' : this.isParent() ? 'card_giftcard' : this.lacking() === 0 ? 'shopping_cart' : 'lock',
  );

  // ---------- idées de tenues du thème du moment
  readonly ideas = computed(() => {
    const theme = this.activeTheme();
    this.shop.wallet();
    const config = this.config();
    return (theme === 'neutre' ? [] : (OUTFIT_IDEAS[theme] ?? [])).map((idea) => {
      const missing = ideaArticles(idea).filter((id) => this.shopService.price(id) > 0 && !this.shop.owns(id));
      return { idea, title: ideaTitle(idea), config: applyIdea(config, idea), price: missing.reduce((s, id) => s + this.shopService.price(id), 0) };
    });
  });

  applyIdea(idea: OutfitIdea): void {
    this.config.update((c) => applyIdea(c, idea));
    this.reactions.next('pop');
  }

  // ---------- tenues de thème enregistrées
  readonly themes = SEASON_IDS.map((id) => ({ id, label: seasonLabel(id) }));
  readonly outfitTheme = signal<SeasonId>(this.activeTheme() === 'neutre' ? 'halloween' : (this.activeTheme() as SeasonId));
  readonly outfits = signal<Record<string, Record<string, unknown>>>(this.member.tenues ?? {});
  readonly outfitAuto = signal(this.member.tenueAuto !== false);
  readonly savedOutfit = computed(() => this.outfits()[toApiTheme(this.outfitTheme())] ?? null);
  readonly savedConfig = computed(() => {
    const saved = this.savedOutfit();
    return saved ? normalizeAvatar(saved, this.config()) : null;
  });
  readonly themeLabel = computed(() => seasonLabel(this.outfitTheme()));
  private outfitsChanged = false;

  saveOutfit(): void {
    const theme = toApiTheme(this.outfitTheme()) as Parameters<TenuesService['updateTenue']>[1];
    this.tenuesApi.updateTenue(this.member.id!, theme, { ...this.config() }).subscribe((outfits) => {
      this.outfits.set(outfits);
      this.outfitsChanged = true;
    });
  }

  removeOutfit(): void {
    const theme = toApiTheme(this.outfitTheme()) as Parameters<TenuesService['deleteTenue']>[1];
    this.tenuesApi.deleteTenue(this.member.id!, theme).subscribe((outfits) => {
      this.outfits.set(outfits);
      this.outfitsChanged = true;
    });
  }

  tryOutfit(): void {
    const saved = this.savedOutfit();
    if (saved) {
      this.config.set(normalizeAvatar(saved, this.config()));
      this.reactions.next('pop');
    }
  }

  setOutfitAuto(actif: boolean): void {
    this.outfitAuto.set(actif);
    this.tenuesApi.updateTenueAuto(this.member.id!, { actif }).subscribe({
      next: () => (this.outfitsChanged = true),
      error: () => this.outfitAuto.set(!actif),
    });
  }

  /** Reprend un membre enregistré ailleurs (ex. par le mode simple) : personnage, tenues et port automatique. */
  adopt(member: FamilyMemberDTO): void {
    this.config.set(normalizeAvatar(member.avatarConfig, this.config()));
    this.outfits.set(member.tenues ?? {});
    this.outfitAuto.set(member.tenueAuto !== false);
  }

  /** Membre à renvoyer à l'écran qui a ouvert l'habillage si on le quitte sans enregistrer le personnage (sinon undefined). */
  memberIfOutfitsChanged(): FamilyMemberDTO | undefined {
    return this.outfitsChanged ? { ...this.member, tenues: this.outfits(), tenueAuto: this.outfitAuto() } : undefined;
  }

  // ---------- enregistrement et achat

  /**
   * Enregistrer : directement si tout est possédé ; sinon un parent offre les articles, et un enfant les achète après
   * confirmation (`confirmPurchase` ouvre la confirmation et fait les achats, puis répond true). Émet le membre
   * enregistré ; ne répond rien si l'enfant n'a pas assez de pièces ou refuse.
   */
  saveOrBuy(confirmPurchase: (articleIds: string[], config: AvatarConfig) => Observable<boolean>): Observable<FamilyMemberDTO> {
    const missing = this.missing();
    if (missing.length === 0) {
      return this.save();
    }
    if (this.isParent()) {
      this.saving.set(true);
      return this.giftAll(missing, 0);
    }
    if (this.lacking() === 0) {
      return new Observable<FamilyMemberDTO>((subscriber) => {
        const sub = confirmPurchase(missing, this.config()).subscribe({
          next: (bought) => {
            if (!bought) {
              subscriber.complete();
              return;
            }
            this.save().subscribe(subscriber);
          },
          error: (e) => subscriber.error(e),
        });
        return () => sub.unsubscribe();
      });
    }
    return of();
  }

  private giftAll(ids: string[], index: number): Observable<FamilyMemberDTO> {
    if (index >= ids.length) {
      return this.save();
    }
    return new Observable<FamilyMemberDTO>((subscriber) => {
      this.shop.gift(ids[index]).subscribe({
        next: () => this.giftAll(ids, index + 1).subscribe(subscriber),
        error: (e) => {
          this.saving.set(false);
          subscriber.error(e);
        },
      });
    });
  }

  /** Enregistre le personnage ; émet le membre avec ses tenues de thème. */
  save(): Observable<FamilyMemberDTO> {
    this.saving.set(true);
    return this.api.updateAvatarMembre(this.member.id!, { ...this.config() }).pipe(
      map((saved) => ({ ...saved, tenues: this.outfits(), tenueAuto: this.outfitAuto() })),
      tap({ error: () => this.saving.set(false) }), // message affiché par l'intercepteur
    );
  }
}
