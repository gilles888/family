import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { enabledDashboardCards } from './dashboard-cards';
import { MobilePanelService } from './mobile-panel.service';

/** Espace laissé au-dessus d'une carte quand on défile jusqu'à elle (px). */
const CARD_SCROLL_MARGIN = 12;

/**
 * Page Mobile : panneau qui glisse depuis la droite de l'écran et regroupe les cartes du registre
 * (`dashboard-cards.ts`). Plein écran sous 1000 px, 480 px au-delà. S'ouvre et se ferme par la languette du bord droit.
 */
@Component({
  selector: 'app-mobile-page',
  imports: [NgComponentOutlet, A11yModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-page.html',
  styleUrl: './mobile-page.scss',
  host: {
    '[style.--progress]': 'progress()',
    '[class.closed]': '!panel.isOpen()',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class MobilePageComponent {
  protected readonly panel = inject(MobilePanelService);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);

  private readonly sheet = viewChild.required<ElementRef<HTMLElement>>('sheet');
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly tab = viewChild.required<ElementRef<HTMLElement>>('tab');

  protected readonly cards = enabledDashboardCards();
  protected readonly openLabel = $localize`:@@mobile.open:Ouvrir le tableau de bord`;
  protected readonly closeLabel = $localize`:@@mobile.close:Fermer le tableau de bord`;

  /** 0 = fermée, 1 = ouverte. */
  protected readonly progress = computed(() => (this.panel.isOpen() ? 1 : 0));

  /** Les cartes ne sont créées qu'à la première ouverture (pas d'appel à l'API tant que la page reste fermée). */
  protected readonly rendered = linkedSignal<boolean, boolean>({
    source: this.panel.isOpen,
    computation: (open, previous) => open || (previous?.value ?? false),
  });

  constructor() {
    // Focus : sur le titre à l'ouverture, rendu à la languette à la fermeture s'il était dans la page
    let wasOpen = untracked(this.panel.isOpen);
    effect(() => {
      const open = this.panel.isOpen();
      if (open === wasOpen) {
        return;
      }
      wasOpen = open;
      if (open) {
        this.heading().nativeElement.focus({ preventScroll: true });
      } else if (this.sheet().nativeElement.contains(document.activeElement)) {
        this.tab().nativeElement.focus();
      }
    });

    // open(cardId) : défilement jusqu'à la carte, une fois la page ouverte et les cartes créées
    effect(() => {
      const cardId = this.panel.scrollTarget();
      if (!cardId || !this.panel.isOpen() || !this.rendered()) {
        return;
      }
      afterNextRender(
        () => {
          this.scrollToCard(cardId);
          this.panel.scrollTarget.set(null);
        },
        { injector: this.injector },
      );
    });
  }

  protected cardElementId(cardId: string): string {
    return `dashboard-card-${cardId}`;
  }

  protected scrollToCard(cardId: string): void {
    const body = this.body().nativeElement;
    const card = body.querySelector<HTMLElement>(`#${this.cardElementId(cardId)}`);
    if (!card) {
      return;
    }
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    body.scrollTo({ top: card.offsetTop - CARD_SCROLL_MARGIN, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /** Échap ferme la page, sauf si un dialogue ouvert par dessus doit d'abord se fermer. */
  protected onEscape(): void {
    if (this.panel.isOpen() && this.dialog.openDialogs.length === 0) {
      this.panel.close();
    }
  }
}
