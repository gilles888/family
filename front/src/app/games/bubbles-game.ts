import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { SoundService } from '../shared/sound.service';
import { GAME_CONTEXT } from './mini-game';

interface Bubble {
  id: number;
  x: number;
  y: number;
  r: number;
  color: string;
  speed: number;
  phase: number;
  popped: boolean;
}

const DURATION_MS = 30_000;
const COLORS = ['#81d4fa', '#f48fb1', '#a5d6a7', '#fff59d', '#ce93d8', '#ffcc80'];

/**
 * « Éclate les bulles » : des bulles montent, on les touche pour les éclater (souris, doigt, stylet : Pointer
 * Events). 30 secondes, pas d'échec : chaque bulle éclatée fait sauter le personnage.
 */
@Component({
  selector: 'app-bubbles-game',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hud">
      <span class="score" aria-live="polite">🫧 {{ score() }}</span>
      <div class="time" aria-hidden="true"><div class="left" [style.width.%]="timeLeft() * 100"></div></div>
    </div>
    <div #field class="field">
      <svg [attr.viewBox]="'0 0 100 ' + height()" (pointerdown)="$event.preventDefault()">
        <defs>
          <radialGradient id="bubble-shine" cx="35%" cy="30%" r="70%">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0.9" />
            <stop offset="0.35" stop-color="#ffffff" stop-opacity="0.15" />
            <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
        </defs>
        @for (b of bubbles(); track b.id) {
          <g
            class="bubble"
            [class.popped]="b.popped"
            [attr.transform]="'translate(' + b.x + ' ' + b.y + ')'"
            (pointerdown)="pop(b)"
          >
            <g class="inner">
              <circle [attr.r]="b.r" [attr.fill]="b.color" fill-opacity="0.55" stroke="#ffffff" stroke-width="0.8" />
              <circle [attr.r]="b.r" fill="url(#bubble-shine)" />
            </g>
          </g>
        }
      </svg>
      <app-avatar class="hero" [class.jump]="jump()" [member]="context.member" [size]="84" />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      user-select: none;
    }
    .hud {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .score {
      font: 700 28px / 1 Roboto;
      min-width: 80px;
    }
    .time {
      flex: 1;
      height: 12px;
      border-radius: 6px;
      background: #e3f2fd;
      overflow: hidden;
    }
    .left {
      height: 100%;
      background: linear-gradient(90deg, #4fc3f7, #81c784);
    }
    .field {
      position: relative;
      flex: 1;
      min-height: 0;
      border-radius: 20px;
      overflow: hidden;
      background: linear-gradient(180deg, #e1f5fe, #fce4ec);
      touch-action: none;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .bubble {
      cursor: pointer;
    }
    .inner {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 220ms ease-out, opacity 220ms ease-out;
    }
    .popped .inner {
      transform: scale(1.8);
      opacity: 0;
    }
    .hero {
      position: absolute;
      left: 50%;
      bottom: 8px;
      margin-left: -42px;
      box-shadow: 0 0 0 3px #ffffff;
      pointer-events: none;
    }
    .hero.jump {
      animation: jump 380ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes jump {
      40% {
        transform: translateY(-26px) scale(1.06);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .inner {
        transition: none;
      }
      .hero.jump {
        animation: none;
      }
    }
  `,
})
export class BubblesGame {
  protected readonly context = inject(GAME_CONTEXT);
  private readonly sound = inject(SoundService);

  protected readonly bubbles = signal<Bubble[]>([]);
  protected readonly score = signal(0);
  protected readonly jump = signal(false);
  private readonly elapsed = signal(0);
  protected readonly timeLeft = computed(() => Math.max(0, 1 - this.elapsed() / DURATION_MS));

  /** Hauteur du terrain en unités SVG : la largeur vaut toujours 100, la hauteur suit l'écran (bulles jamais déformées). */
  protected readonly height = signal(140);
  private readonly field = viewChild.required<ElementRef<HTMLElement>>('field');

  private nextId = 0;
  private lastSpawn = 0;
  private frame = 0;
  private start = 0;
  private last = 0;
  private finished = false;

  constructor() {
    this.frame = requestAnimationFrame((t) => this.tick(t));
    let observer: ResizeObserver | undefined;
    afterNextRender(() => {
      const el = this.field().nativeElement;
      const measure = () => el.clientWidth > 0 && this.height.set(Math.max(60, (100 * el.clientHeight) / el.clientWidth));
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure);
        observer.observe(el);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
      observer?.disconnect();
    });
  }

  protected pop(bubble: Bubble): void {
    if (bubble.popped || this.finished) {
      return;
    }
    this.bubbles.update((list) => list.map((b) => (b === bubble ? { ...b, popped: true } : b)));
    setTimeout(() => this.bubbles.update((list) => list.filter((b) => b.id !== bubble.id)), 240);
    this.score.update((s) => s + 1);
    this.sound.play('pop');
    this.jump.set(false);
    requestAnimationFrame(() => this.jump.set(true));
  }

  private tick(time: number): void {
    if (!this.start) {
      this.start = this.last = time;
    }
    const dt = Math.min(50, time - this.last);
    this.last = time;
    this.elapsed.set(time - this.start);
    if (this.elapsed() >= DURATION_MS) {
      this.finished = true;
      this.context.finish(this.score());
      return;
    }
    if (time - this.lastSpawn > 650 && this.bubbles().length < 12) {
      this.lastSpawn = time;
      this.spawn();
    }
    this.bubbles.update((list) =>
      list
        .map((b) => (b.popped ? b : { ...b, y: b.y - b.speed * dt, x: b.x + Math.sin((time / 600) + b.phase) * 0.08 }))
        .filter((b) => b.y + b.r > -5),
    );
    this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  private spawn(): void {
    const r = 6 + Math.random() * 5;
    this.bubbles.update((list) => [
      ...list,
      {
        id: this.nextId++,
        x: r + Math.random() * (100 - 2 * r),
        y: this.height() + r,
        r,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: 0.012 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
        popped: false,
      },
    ]);
  }
}
