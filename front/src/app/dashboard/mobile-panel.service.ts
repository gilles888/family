import { Injectable, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Paramètre d'URL qui garde la page Mobile ouverte : `?panel=mobile`. */
const PANEL_PARAM = 'panel';
const PANEL_VALUE = 'mobile';

/**
 * État ouvert / fermé de la page Mobile, synchronisé avec l'URL (`?panel=mobile`) : le bouton retour du navigateur
 * ou du téléphone la ferme, et un lien avec le paramètre l'ouvre directement.
 */
@Injectable({ providedIn: 'root' })
export class MobilePanelService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly opened = signal(false);
  readonly isOpen = this.opened.asReadonly();

  /** Carte vers laquelle défiler à la prochaine ouverture ; remis à null par la page une fois fait. */
  readonly scrollTarget = signal<string | null>(null);

  /** Vrai si l'ouverture a ajouté une entrée d'historique : la fermeture revient alors en arrière. */
  private pushedHistory = false;

  constructor() {
    this.syncFromUrl();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncFromUrl());
  }

  /** Ouvre la page Mobile, et y fait défiler jusqu'à la carte `cardId` si elle est donnée. */
  open(cardId?: string): void {
    if (cardId) {
      this.scrollTarget.set(cardId);
    }
    if (this.opened()) {
      return;
    }
    this.opened.set(true);
    this.pushedHistory = true;
    this.navigateWithPanel(PANEL_VALUE, false);
  }

  close(): void {
    if (!this.opened()) {
      return;
    }
    this.opened.set(false);
    if (this.pushedHistory) {
      this.pushedHistory = false;
      this.location.back();
    } else {
      // Ouverte par l'URL (lien, rechargement) : on retire le paramètre sans quitter la page
      this.navigateWithPanel(null, true);
    }
  }

  toggle(): void {
    if (this.opened()) {
      this.close();
    } else {
      this.open();
    }
  }

  private syncFromUrl(): void {
    const open = this.router.parseUrl(this.router.url).queryParamMap.get(PANEL_PARAM) === PANEL_VALUE;
    if (!open) {
      this.pushedHistory = false;
    }
    this.opened.set(open);
  }

  /** Garde la route et les autres paramètres, ne change que `panel`. */
  private navigateWithPanel(value: string | null, replaceUrl: boolean): void {
    const tree = this.router.parseUrl(this.router.url);
    const { [PANEL_PARAM]: _previous, ...others } = tree.queryParams;
    tree.queryParams = value === null ? others : { ...others, [PANEL_PARAM]: value };
    void this.router.navigateByUrl(tree, { replaceUrl });
  }
}
