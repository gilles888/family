import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { RoutineIllustration } from '../routines/routine-icon';
import { ROUTINE_ICONS } from '../routines/routine-icons';
import { SoundService } from '../shared/sound.service';
import { GAME_CONTEXT } from './mini-game';

interface Card {
  id: number;
  icon: string;
  label: string;
  faceUp: boolean;
  matched: boolean;
}

const PAIRS = 6;

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Memory : 6 paires d'illustrations des routines, le dos des cartes à l'effigie de l'enfant. On retourne deux
 * cartes ; pas de temps limite ni d'échec, la partie finit quand toutes les paires sont trouvées.
 */
@Component({
  selector: 'app-memory-game',
  imports: [Avatar, RoutineIllustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="found" aria-live="polite">⭐ {{ found() }} / {{ pairs }}</p>
    <div class="grid">
      @for (card of cards(); track card.id) {
        <button
          type="button"
          class="card"
          [class.up]="card.faceUp || card.matched"
          [class.matched]="card.matched"
          [attr.aria-label]="card.faceUp || card.matched ? card.label : hidden"
          (click)="flip(card)"
        >
          <span class="inner">
            <span class="back"><app-avatar [member]="context.member" [size]="null" [round]="false" /></span>
            <span class="front"><app-routine-icon [icon]="card.icon" [size]="64" /></span>
          </span>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 100%;
    }
    .found {
      margin: 0;
      font: 700 26px / 1 Roboto;
    }
    .grid {
      flex: 1;
      width: min(100%, 560px);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      align-content: center;
    }
    @media (min-aspect-ratio: 1/1) {
      .grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .card {
      all: unset;
      aspect-ratio: 1;
      perspective: 600px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .card:focus-visible .inner {
      outline: 3px solid var(--mat-sys-primary);
      outline-offset: 3px;
    }
    .inner {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 16px;
      transform-style: preserve-3d;
      transition: transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .card.up .inner {
      transform: rotateY(180deg);
    }
    .back,
    .front {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      border-radius: 16px;
      overflow: hidden;
      backface-visibility: hidden;
      box-shadow: var(--mat-sys-level1);
    }
    .back {
      background: #ffe0b2;
      padding: 6px;
    }
    .back app-avatar {
      border-radius: 12px;
    }
    .front {
      transform: rotateY(180deg);
      background: #fffde7;
    }
    .matched .front {
      background: #dcfce7;
      box-shadow: 0 0 0 4px #66bb6a;
    }
    @media (prefers-reduced-motion: reduce) {
      .inner {
        transition: none;
      }
    }
  `,
})
export class MemoryGame {
  protected readonly context = inject(GAME_CONTEXT);
  private readonly sound = inject(SoundService);

  protected readonly pairs = PAIRS;
  protected readonly hidden = $localize`:@@game.memory.hidden:Carte cachée`;
  protected readonly cards = signal<Card[]>(
    shuffle(
      shuffle(ROUTINE_ICONS)
        .slice(0, PAIRS)
        .flatMap((icon, i) => [0, 1].map((k) => ({ id: i * 2 + k, icon: icon.id, label: icon.label, faceUp: false, matched: false }))),
    ),
  );
  protected readonly found = computed(() => this.cards().filter((c) => c.matched).length / 2);

  private moves = 0;
  private busy = false;

  protected flip(card: Card): void {
    if (this.busy || card.faceUp || card.matched) {
      return;
    }
    this.update(card.id, { faceUp: true });
    const open = this.cards().filter((c) => c.faceUp && !c.matched);
    if (open.length < 2) {
      return;
    }
    this.moves++;
    const [a, b] = open;
    if (a.icon === b.icon) {
      this.sound.play('check');
      this.update(a.id, { matched: true, faceUp: false });
      this.update(b.id, { matched: true, faceUp: false });
      if (this.found() === PAIRS) {
        setTimeout(() => this.context.finish(PAIRS), 700);
      }
    } else {
      this.busy = true;
      setTimeout(() => {
        this.update(a.id, { faceUp: false });
        this.update(b.id, { faceUp: false });
        this.busy = false;
      }, 900);
    }
  }

  private update(id: number, change: Partial<Card>): void {
    this.cards.update((cards) => cards.map((c) => (c.id === id ? { ...c, ...change } : c)));
  }
}
