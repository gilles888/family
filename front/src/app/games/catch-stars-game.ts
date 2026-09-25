import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { SoundService } from '../shared/sound.service';
import { star as starShape } from '../shared/svg/shapes';
import { GAME_CONTEXT } from './mini-game';

interface Star {
  id: number;
  x: number;
  y: number;
  speed: number;
  spin: number;
  caught: boolean;
}

const DURATION_MS = 40_000;
/** Demi-largeur de la zone où le personnage attrape (unités SVG, largeur du terrain = 100). */
const REACH = 11;
const STAR_PATH = starShape(0, 0, 6, 2.6, '#ffca28').d!;

/**
 * « Attrape les étoiles » : le personnage de l'enfant glisse en bas de l'écran (doigt, souris, stylet : on le fait
 * suivre le pointeur ; flèches au clavier) et attrape les étoiles qui tombent. 40 s ; une étoile ratée disparaît
 * simplement, sans échec.
 */
@Component({
  selector: 'app-catch-stars-game',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKey($event)' },
  template: `
    <div class="hud">
      <span class="score" aria-live="polite">⭐ {{ score() }}</span>
      <div class="time" aria-hidden="true"><div class="left" [style.width.%]="timeLeft() * 100"></div></div>
    </div>
    <div
      #field
      class="field"
      tabindex="0"
      i18n-aria-label="@@game.stars.field"
      aria-label="Terrain : glisse ton personnage ou utilise les flèches"
      (pointerdown)="onPointer($event, true)"
      (pointermove)="onPointer($event, false)"
      (pointerup)="dragging = false"
      (pointercancel)="dragging = false"
    >
      <svg [attr.viewBox]="'0 0 100 ' + height()" aria-hidden="true">
        @for (s of stars(); track s.id) {
          <g [attr.transform]="'translate(' + s.x + ' ' + s.y + ') rotate(' + s.spin + ')'" [class.caught]="s.caught">
            <path class="star" [attr.d]="starPath" fill="#ffca28" stroke="#ffb300" stroke-width="0.6" />
          </g>
        }
      </svg>
      <app-avatar class="hero" [class.happy]="happy()" [style.left.%]="heroX()" [member]="context.member" [size]="76" />
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
      background: #ede7f6;
      overflow: hidden;
    }
    .left {
      height: 100%;
      background: linear-gradient(90deg, #7e57c2, #ffca28);
    }
    .field {
      position: relative;
      flex: 1;
      min-height: 0;
      border-radius: 20px;
      overflow: hidden;
      background: linear-gradient(180deg, #1f2a5c, #4a3f8f 70%, #7e57c2);
      touch-action: none;
      cursor: grab;
      outline: none;
    }
    .field:focus-visible {
      box-shadow: inset 0 0 0 4px #ffca28;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .caught {
      opacity: 0;
      transition: opacity 200ms;
    }
    .hero {
      position: absolute;
      bottom: 10px;
      margin-left: -38px;
      box-shadow: 0 0 0 3px #ffffff;
      pointer-events: none;
      transition: left 60ms linear;
    }
    .hero.happy {
      animation: happy 300ms ease-out;
    }
    @keyframes happy {
      50% {
        transform: translateY(-14px) scale(1.08);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .hero {
        transition: none;
      }
      .hero.happy {
        animation: none;
      }
    }
  `,
})
export class CatchStarsGame {
  protected readonly context = inject(GAME_CONTEXT);
  private readonly sound = inject(SoundService);
  private readonly field = viewChild.required<ElementRef<HTMLElement>>('field');

  protected readonly starPath = STAR_PATH;
  protected readonly stars = signal<Star[]>([]);
  protected readonly score = signal(0);
  protected readonly heroX = signal(50);
  protected readonly happy = signal(false);
  protected readonly height = signal(140);
  private readonly elapsed = signal(0);
  protected readonly timeLeft = computed(() => Math.max(0, 1 - this.elapsed() / DURATION_MS));

  protected dragging = false;
  private nextId = 0;
  private lastSpawn = 0;
  private frame = 0;
  private start = 0;
  private last = 0;

  constructor() {
    this.frame = requestAnimationFrame((t) => this.tick(t));
    let observer: ResizeObserver | undefined;
    afterNextRender(() => {
      const el = this.field().nativeElement;
      const measure = () => el.clientWidth > 0 && this.height.set(Math.max(60, (100 * el.clientHeight) / el.clientWidth));
      measure();
      el.focus({ preventScroll: true });
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

  protected onPointer(event: PointerEvent, down: boolean): void {
    if (down) {
      this.dragging = true;
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }
    if (!this.dragging && event.pointerType !== 'mouse') {
      return;
    }
    const rect = this.field().nativeElement.getBoundingClientRect();
    this.heroX.set(Math.min(95, Math.max(5, ((event.clientX - rect.left) / rect.width) * 100)));
  }

  protected onKey(event: KeyboardEvent): void {
    const step = event.key === 'ArrowLeft' ? -8 : event.key === 'ArrowRight' ? 8 : 0;
    if (step) {
      event.preventDefault();
      this.heroX.update((x) => Math.min(95, Math.max(5, x + step)));
    }
  }

  private tick(time: number): void {
    if (!this.start) {
      this.start = this.last = time;
    }
    const dt = Math.min(50, time - this.last);
    this.last = time;
    this.elapsed.set(time - this.start);
    if (this.elapsed() >= DURATION_MS) {
      this.context.finish(this.score());
      return;
    }
    if (time - this.lastSpawn > 700) {
      this.lastSpawn = time;
      this.stars.update((list) => [
        ...list,
        { id: this.nextId++, x: 8 + Math.random() * 84, y: -8, speed: 0.02 + Math.random() * 0.015, spin: 0, caught: false },
      ]);
    }
    const catchY = this.height() - 16;
    const hero = this.heroX();
    let caught = 0;
    this.stars.update((list) =>
      list
        .map((s) => {
          if (s.caught) {
            return s;
          }
          const y = s.y + s.speed * dt;
          if (y >= catchY - 6 && y <= catchY + 6 && Math.abs(s.x - hero) <= REACH) {
            caught++;
            return { ...s, y, caught: true };
          }
          return { ...s, y, spin: s.spin + dt * 0.1 };
        })
        .filter((s) => (s.caught ? s.y < catchY + 1 : s.y < this.height() + 10)),
    );
    if (caught) {
      this.score.update((n) => n + caught);
      this.sound.play('catch');
      this.happy.set(false);
      requestAnimationFrame(() => this.happy.set(true));
      // les étoiles attrapées s'effacent puis disparaissent
      setTimeout(() => this.stars.update((list) => list.filter((s) => !s.caught)), 220);
    }
    this.frame = requestAnimationFrame((t) => this.tick(t));
  }
}
