import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { Avatar } from '../avatar/avatar';
import { SoundService } from '../shared/sound.service';
import { GAME_CONTEXT } from './mini-game';

/** 2 × 2 pièces (un puzzle doux pour les petits). */
const SIDE = 2;
const PIECES = SIDE * SIDE;

function shuffled(count: number): number[] {
  const list = Array.from({ length: count }, (_, i) => i);
  do {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  } while (list.every((v, i) => v === i));
  return list;
}

/**
 * Puzzle du personnage : l'avatar de l'enfant découpé en 4 pièces, à glisser sur le cadre (CDK DragDrop : souris,
 * doigt, stylet). Une case n'accepte que sa pièce ; ailleurs, la pièce revient au bac, sans pénalité. Au tap (ou au
 * clavier) : toucher une pièce puis sa case.
 */
@Component({
  selector: 'app-puzzle-game',
  imports: [CdkDrag, CdkDragPlaceholder, CdkDropList, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint" i18n="@@game.puzzle.hint">Remets ton personnage en place !</p>
    <div class="board" [class.complete]="complete()">
      @for (slot of slots; track slot) {
        <div
          class="slot"
          [class.filled]="placed().has(slot)"
          [class.shake]="shaking() === slot"
          cdkDropList
          cdkDropListSortingDisabled
          [id]="'puzzle-slot-' + slot"
          [cdkDropListEnterPredicate]="accepts(slot)"
          (cdkDropListDropped)="dropped($event, slot)"
          (click)="tapSlot(slot)"
        >
          <app-avatar class="ghost" [class.shown]="placed().has(slot)" [member]="context.member" [size]="null" [round]="false" [viewBox]="box(slot)" />
        </div>
      }
    </div>
    <div class="tray" cdkDropList cdkDropListSortingDisabled cdkDropListOrientation="horizontal" id="puzzle-tray" [cdkDropListConnectedTo]="slotIds">
      @for (piece of tray(); track piece) {
        <button
          type="button"
          class="piece"
          [class.selected]="selected() === piece"
          cdkDrag
          [cdkDragData]="piece"
          (click)="select(piece)"
          i18n-aria-label="@@game.puzzle.piece"
          aria-label="Pièce du puzzle"
        >
          <app-avatar [member]="context.member" [size]="null" [round]="false" [viewBox]="box(piece)" />
          <span *cdkDragPlaceholder class="placeholder"></span>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      height: 100%;
      user-select: none;
    }
    .hint {
      margin: 0;
      font: 700 22px / 1.2 Roboto;
      text-align: center;
    }
    .board {
      width: min(100%, 46dvh, 380px);
      aspect-ratio: 1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      padding: 4px;
      border-radius: 20px;
      background: #ffe0b2;
      box-sizing: border-box;
      transition: gap 300ms, padding 300ms;
    }
    .board.complete {
      gap: 0;
      padding: 0;
      animation: tada 700ms ease-out;
    }
    @keyframes tada {
      40% {
        transform: scale(1.06) rotate(-2deg);
      }
      70% {
        transform: scale(0.98) rotate(1deg);
      }
    }
    .slot {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      background: #fff8e1;
      cursor: pointer;
    }
    .slot.shake {
      animation: shake 300ms;
    }
    @keyframes shake {
      25% {
        transform: translateX(-5px);
      }
      75% {
        transform: translateX(5px);
      }
    }
    .ghost {
      opacity: 0.18;
      filter: grayscale(1);
      transition: opacity 250ms, filter 250ms;
    }
    .ghost.shown {
      opacity: 1;
      filter: none;
      animation: pop 300ms cubic-bezier(0.2, 0.8, 0.2, 1.4);
    }
    @keyframes pop {
      from {
        transform: scale(0.8);
      }
    }
    .slot ::ng-deep .cdk-drag-placeholder {
      position: absolute;
      inset: 0;
      opacity: 0;
    }
    .tray {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      min-height: 110px;
    }
    .piece {
      all: unset;
      width: 100px;
      height: 100px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--mat-sys-level2);
      cursor: grab;
      touch-action: none;
    }
    .piece.selected {
      box-shadow: 0 0 0 4px var(--mat-sys-primary);
    }
    .piece:focus-visible {
      outline: 3px solid var(--mat-sys-primary);
      outline-offset: 3px;
    }
    .placeholder {
      display: block;
      width: 100px;
      height: 100px;
      border-radius: 12px;
      background: rgb(0 0 0 / 0.06);
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      .board.complete,
      .slot.shake,
      .ghost.shown {
        animation: none;
      }
    }
  `,
})
export class PuzzleGame {
  protected readonly context = inject(GAME_CONTEXT);
  private readonly sound = inject(SoundService);

  protected readonly slots = Array.from({ length: PIECES }, (_, i) => i);
  protected readonly slotIds = this.slots.map((i) => `puzzle-slot-${i}`);
  protected readonly placed = signal(new Set<number>());
  protected readonly tray = signal(shuffled(PIECES));
  protected readonly selected = signal<number | null>(null);
  protected readonly shaking = signal<number | null>(null);
  protected readonly complete = computed(() => this.placed().size === PIECES);

  /** Morceau (colonne, ligne) de l'avatar, dans son viewBox 200 × 200. */
  protected box(piece: number): string {
    const size = 200 / SIDE;
    return `${(piece % SIDE) * size} ${Math.floor(piece / SIDE) * size} ${size} ${size}`;
  }

  /** Une case n'accepte que sa propre pièce : ailleurs, la pièce revient au bac (animation du CDK). */
  protected accepts(slot: number): (drag: CdkDrag<number>) => boolean {
    return (drag) => drag.data === slot;
  }

  protected dropped(event: CdkDragDrop<unknown, unknown, number>, slot: number): void {
    if (event.isPointerOverContainer && event.item.data === slot) {
      this.place(slot);
    }
  }

  protected select(piece: number): void {
    this.selected.set(this.selected() === piece ? null : piece);
  }

  protected tapSlot(slot: number): void {
    const piece = this.selected();
    if (piece === null || this.placed().has(slot)) {
      return;
    }
    if (piece === slot) {
      this.place(slot);
    } else {
      this.shaking.set(slot);
      setTimeout(() => this.shaking.set(null), 320);
    }
  }

  private place(piece: number): void {
    this.placed.update((set) => new Set(set).add(piece));
    this.tray.update((list) => list.filter((p) => p !== piece));
    this.selected.set(null);
    this.sound.play('check');
    if (this.complete()) {
      setTimeout(() => this.context.finish(), 1200);
    }
  }
}
