import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, tap } from 'rxjs';
import { ArticleDTO, BoutiqueService, PorteMonnaieDTO } from '../api-client';

/** Porte-monnaie et articles possédés d'un membre (les articles gratuits le sont d'office). */
export class MemberShop {
  readonly wallet = signal<PorteMonnaieDTO | null>(null);
  private readonly owned = signal<ReadonlySet<string>>(new Set());

  readonly pieces = computed(() => this.wallet()?.pieces ?? 0);
  readonly stars = computed(() => this.wallet()?.etoilesDisponibles ?? 0);
  readonly rate = computed(() => this.wallet()?.etoilesParPiece ?? 10);
  /** Pièces d'or qu'on peut obtenir en échangeant toutes les étoiles disponibles. */
  readonly exchangeable = computed(() => Math.floor(this.stars() / this.rate()));

  constructor(
    readonly memberId: number,
    private readonly shop: ShopService,
    private readonly api: BoutiqueService,
  ) {}

  /** (Re)charge le porte-monnaie, les articles possédés et le catalogue. */
  load(): Observable<void> {
    return forkJoin([this.api.getPorteMonnaie(this.memberId), this.api.listArticlesPossedes(this.memberId), this.shop.loadCatalogue()]).pipe(
      tap(([wallet, items]) => {
        this.wallet.set(wallet);
        this.owned.set(new Set(items.map((i) => i.articleId!)));
      }),
      map(() => undefined),
    );
  }

  /** Possédé : gratuit, ou acheté / offert. Un article inconnu du catalogue est considéré gratuit. */
  owns(articleId: string): boolean {
    return this.shop.price(articleId) === 0 || this.owned().has(articleId);
  }

  exchange(pieces: number): Observable<PorteMonnaieDTO> {
    return this.api.echangerEtoiles(this.memberId, { pieces }).pipe(tap((w) => this.wallet.set(w)));
  }

  buy(articleId: string): Observable<PorteMonnaieDTO> {
    return this.api.acheterArticle(this.memberId, { articleId }).pipe(tap((w) => this.markOwned(articleId, w)));
  }

  gift(articleId: string): Observable<PorteMonnaieDTO> {
    return this.api.offrirArticle(this.memberId, { articleId }).pipe(tap((w) => this.markOwned(articleId, w)));
  }

  private markOwned(articleId: string, wallet: PorteMonnaieDTO): void {
    this.wallet.set(wallet);
    this.owned.update((set) => new Set(set).add(articleId));
  }
}

/** Boutique : catalogue (prix du serveur) et état de chaque membre. */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly api = inject(BoutiqueService);
  private readonly catalogueSignal = signal<ReadonlyMap<string, ArticleDTO>>(new Map());
  private readonly members = new Map<number, MemberShop>();
  private catalogueLoaded = false;

  readonly catalogue = this.catalogueSignal.asReadonly();

  /** L'état de la boutique d'un membre (créé une fois, partagé par tous les écrans). */
  of(memberId: number): MemberShop {
    let shop = this.members.get(memberId);
    if (!shop) {
      shop = new MemberShop(memberId, this, this.api);
      this.members.set(memberId, shop);
    }
    return shop;
  }

  loadCatalogue(): Observable<void> {
    return this.api.getCatalogueBoutique().pipe(
      tap((articles) => {
        this.catalogueSignal.set(new Map(articles.map((a) => [a.id!, a])));
        this.catalogueLoaded = true;
      }),
      map(() => undefined),
    );
  }

  /** Prix en pièces (0 = gratuit ; inconnu = gratuit : le serveur reste juge). */
  price(articleId: string): number {
    return this.catalogueSignal().get(articleId)?.prix ?? 0;
  }

  get ready(): boolean {
    return this.catalogueLoaded;
  }
}
