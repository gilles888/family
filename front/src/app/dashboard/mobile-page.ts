import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
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
/** Déplacement avant de décider si le geste est horizontal (glissement) ou vertical (défilement), en px. */
const AXIS_LOCK_DISTANCE = 10;
/** Part de la largeur à parcourir pour que le glissement aboutisse au relâchement. */
const COMPLETE_RATIO = 0.4;
/** Au-delà de cette vitesse (px/ms), un geste bref aboutit quelle que soit la distance. */
const FLING_VELOCITY = 0.5;

/** Geste en cours (doigt, souris ou stylet). */
interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  /** Progression au début du geste : 0 (fermée) ou 1 (ouverte). */
  startProgress: number;
  width: number;
  /** null tant que le sens du geste n'est pas décidé. */
  axis: 'x' | 'y' | null;
  lastX: number;
  lastTime: number;
  /** Vitesse horizontale lissée, px/ms (négative vers la gauche). */
  velocity: number;
}

/**
 * Page Mobile : panneau qui glisse depuis la droite de l'écran et regroupe les cartes du registre
 * (`dashboard-cards.ts`). Plein écran sous 1000 px, 480 px au-delà. S'ouvre et se ferme par la languette du bord droit,
 * ou en glissant (Pointer Events : doigt, souris, stylet) : vers la gauche depuis la languette ou le bord de l'écran
 * pour ouvrir, vers la droite sur la page pour fermer. Pendant le glissement, la page suit le pointeur sans transition.
 */
@Component({
  selector: 'app-mobile-page',
  imports: [NgComponentOutlet, A11yModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-page.html',
  styleUrl: './mobile-page.scss',
  host: {
    '[style.--progress]': 'progress()',
    '[class.closed]': '!panel.isOpen() && dragProgress() === null',
    '[class.dragging]': 'dragProgress() !== null',
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

  /** Progression pendant un glissement (0 → 1), null sinon. */
  protected readonly dragProgress = signal<number | null>(null);
  /** 0 = fermée, 1 = ouverte ; suit le pointeur pendant un glissement. */
  protected readonly progress = computed(() => this.dragProgress() ?? (this.panel.isOpen() ? 1 : 0));

  private gesture: Gesture | null = null;
  /** Un glissement se termine par un « click » du navigateur : il ne doit ni basculer la languette ni activer une carte. */
  private suppressClickUntil = 0;

  /** Les cartes ne sont créées qu'à la première ouverture (pas d'appel à l'API tant que la page reste fermée). */
  protected readonly rendered = linkedSignal<boolean, boolean>({
    source: this.panel.isOpen,
    computation: (open, previous) => open || (previous?.value ?? false),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.endGesture());
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.addEventListener(
      'click',
      (event: MouseEvent) => {
        if (event.timeStamp <= this.suppressClickUntil) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true },
    );

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

  // ---------- glissement

  /** Début d'un geste possible : sur la languette ou le bord droit (ouvrir / fermer), sur la page ouverte (fermer). */
  protected onPointerDown(event: PointerEvent, source: 'tab' | 'edge' | 'sheet'): void {
    if (this.gesture || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    if (source === 'sheet' && !this.panel.isOpen()) {
      return;
    }
    this.gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startProgress: this.panel.isOpen() ? 1 : 0,
      width: this.sheet().nativeElement.getBoundingClientRect().width || window.innerWidth,
      axis: null,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
    // Suivi sur window : le pointeur peut quitter la languette ou la bande du bord avant que le sens soit décidé
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const g = this.gesture;
    if (!g || event.pointerId !== g.pointerId) {
      return;
    }
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (g.axis === null) {
      if (Math.hypot(dx, dy) < AXIS_LOCK_DISTANCE) {
        return;
      }
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'y') {
        // Défilement vertical : on laisse faire le navigateur
        this.endGesture();
        return;
      }
      this.rendered.set(true);
      window.getSelection()?.removeAllRanges();
    }
    event.preventDefault();

    const elapsed = event.timeStamp - g.lastTime;
    if (elapsed > 0) {
      g.velocity = 0.8 * ((event.clientX - g.lastX) / elapsed) + 0.2 * g.velocity;
    }
    g.lastX = event.clientX;
    g.lastTime = event.timeStamp;

    const progress = Math.min(1, Math.max(0, g.startProgress - dx / g.width));
    this.dragProgress.set(progress);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const g = this.gesture;
    if (!g || event.pointerId !== g.pointerId) {
      return;
    }
    this.endGesture();
    if (g.axis !== 'x') {
      return; // simple tap : le « click » fait le reste
    }
    this.suppressClickUntil = event.timeStamp + 400;
    // Geste arrêté depuis un moment : il n'est plus rapide
    const velocity = event.timeStamp - g.lastTime > 100 ? 0 : g.velocity;
    const progress = this.dragProgress() ?? g.startProgress;
    let open: boolean;
    if (Math.abs(velocity) > FLING_VELOCITY) {
      open = velocity < 0;
    } else if (Math.abs(progress - g.startProgress) >= COMPLETE_RATIO) {
      open = g.startProgress === 0;
    } else {
      open = g.startProgress === 1;
    }
    // La transition CSS reprend depuis la position du doigt jusqu'à l'état final
    this.dragProgress.set(null);
    if (open) {
      this.panel.open();
    } else {
      this.panel.close();
    }
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.gesture && event.pointerId === this.gesture.pointerId) {
      this.endGesture();
      this.dragProgress.set(null);
    }
  };

  private endGesture(): void {
    this.gesture = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }

  /** Échap ferme la page, sauf si un dialogue ouvert par dessus doit d'abord se fermer. */
  protected onEscape(): void {
    if (this.panel.isOpen() && this.dialog.openDialogs.length === 0) {
      this.panel.close();
    }
  }
}
