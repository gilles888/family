import { Injectable, computed, inject } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import {
  CoursesService,
  GardeMangerService,
  PantryItemDTO,
  ShoppingItemDTO,
  ShoppingItemRequest,
  ShoppingItemStatusRequest,
  ShoppingListDTO,
} from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { toIsoDate } from '../shared/date-utils';
import { isToBuy } from './shopping-list';

/**
 * Liste de courses partagée par la page Courses et sa carte de la page Mobile : un seul chargement, et chaque
 * modification est reportée localement (pas de rechargement complet après avoir coché un article).
 */
@Injectable({ providedIn: 'root' })
export class ShoppingStore {
  private readonly api = inject(CoursesService);
  private readonly pantryApi = inject(GardeMangerService);
  /** Numéro de la dernière requête de statut envoyée, par article. */
  private readonly statusRequests = new Map<number, number>();

  /** L'erreur de chargement est affichée par la page ou la carte (pas de snack-bar). */
  readonly list = rxResource<ShoppingListDTO, void>({
    stream: () =>
      this.api.getCourses('body', false, { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) }),
  });

  readonly items = computed(() => (this.list.hasValue() ? (this.list.value().articles ?? []) : []));
  readonly toBuy = computed(() => this.items().filter(isToBuy));
  readonly boughtCount = computed(() => this.items().filter((i) => i.achete && !i.aLaMaison).length);

  generate(from: Date, to: Date): Observable<ShoppingListDTO> {
    return this.api
      .genererCourses({ dateDebut: toIsoDate(from), dateFin: toIsoDate(to) })
      .pipe(tap((list) => this.list.set(list)));
  }

  add(request: ShoppingItemRequest): Observable<ShoppingItemDTO> {
    return this.api.createArticle(request).pipe(tap((item) => this.patchItems((items) => [...items, item])));
  }

  update(id: number, request: ShoppingItemRequest): Observable<ShoppingItemDTO> {
    return this.api.updateArticle(id, request).pipe(tap((item) => this.replace(item)));
  }

  /** Inverse « acheté » à partir de l'état courant (deux taps rapides : coché puis décoché). */
  toggleBought(id: number): void {
    const item = this.items().find((i) => i.id === id);
    if (item) {
      this.setStatus(id, { achete: !item.achete });
    }
  }

  /**
   * Appliqué tout de suite (en magasin, la réponse du réseau peut tarder). Seule la réponse de la dernière requête
   * d'un article compte : une réponse lente ne peut pas défaire un tap plus récent. Rechargé si le serveur refuse.
   */
  setStatus(id: number, status: ShoppingItemStatusRequest): void {
    const request = (this.statusRequests.get(id) ?? 0) + 1;
    this.statusRequests.set(id, request);
    this.patchItems((items) => items.map((i) => (i.id === id ? { ...i, ...definedOnly(status) } : i)));
    const latest = () => this.statusRequests.get(id) === request;
    this.api.updateArticleStatut(id, status).subscribe({
      next: (saved) => latest() && this.replace(saved),
      error: () => latest() && this.list.reload(),
    });
  }

  remove(item: ShoppingItemDTO): Observable<unknown> {
    return this.api.deleteArticle(item.id!).pipe(tap(() => this.patchItems((items) => items.filter((i) => i.id !== item.id))));
  }

  clearBought(): Observable<unknown> {
    return this.api.viderArticlesAchetes().pipe(tap(() => this.patchItems((items) => items.filter((i) => !i.achete))));
  }

  /** Les lignes de même nom passent « déjà à la maison » côté serveur : la liste est rechargée. */
  addToPantry(nom: string): Observable<PantryItemDTO> {
    return this.pantryApi.addGardeManger({ nom }).pipe(tap(() => this.list.reload()));
  }

  private replace(item: ShoppingItemDTO): void {
    this.patchItems((items) => items.map((i) => (i.id === item.id ? item : i)));
  }

  private patchItems(change: (items: ShoppingItemDTO[]) => ShoppingItemDTO[]): void {
    if (this.list.hasValue()) {
      this.list.update((list) => list && { ...list, articles: change(list.articles ?? []) });
    }
  }
}

function definedOnly(status: ShoppingItemStatusRequest): Partial<ShoppingItemDTO> {
  return Object.fromEntries(Object.entries(status).filter(([, v]) => v !== undefined && v !== null));
}
