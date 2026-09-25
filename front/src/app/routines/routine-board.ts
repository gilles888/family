import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FamilyMemberDTO, RoutineDTO, RoutineStepDTO } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { isHexColor, vivid } from '../shared/svg/shapes';
import { RoutineIllustration } from './routine-icon';
import { routineIcon } from './routine-icons';
import { SoundService } from '../shared/sound.service';
import { progress } from './routine-logic';

interface Burst {
  id: number;
  stepId: number;
}

let nextBurst = 0;

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Couleurs des confettis. */
const CONFETTI = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043'];

/**
 * Tableau d'une routine, dans l'esprit des tableaux papier : en-tête décoré (jour / nuit), lignes pastel numérotées,
 * illustration, grand libellé, case à cocher de la couleur de la ligne. Toute la ligne se coche (souris, doigt,
 * clavier) ; la coche fait un petit « pop » et quelques confettis.
 */
@Component({
  selector: 'app-routine-board',
  imports: [MatIconModule, Avatar, RoutineIllustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-board.html',
  styleUrls: ['./routine-board.scss', './routine-board-celebration.scss'],
  host: {
    '[class.night]': "routine().theme === 'NIGHT'",
  },
})
export class RoutineBoard {
  readonly routine = input.required<RoutineDTO>();
  readonly member = input<FamilyMemberDTO | undefined>();
  readonly toggle = output<number>();
  /** « 🎁 Ma récompense » : la page ouvre le mini-jeu. */
  readonly reward = output<void>();

  private readonly sound = inject(SoundService);
  private readonly celebration = viewChild<ElementRef<HTMLElement>>('celebration');

  protected readonly confetti = CONFETTI;
  protected readonly bursts = signal<Burst[]>([]);

  protected readonly steps = computed(() => this.routine().etapes ?? []);
  protected readonly checked = computed(() => new Set(this.routine().etat?.etapesCochees ?? []));
  protected readonly progress = computed(() => progress(this.routine()));
  protected readonly percent = computed(() => {
    const { done, total } = this.progress();
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  protected readonly finished = computed(() => !!this.routine().etat?.terminee);

  constructor() {
    // Dernière étape cochée pendant qu'on regarde : on montre la fête (en bas du tableau) avec un son de joie
    // (l'état initial est lu au premier passage : une routine déjà finie à l'ouverture ne rejoue pas la fête)
    let wasFinished: boolean | undefined;
    effect(() => {
      const finished = this.finished();
      if (finished && wasFinished === false) {
        this.sound.play('cheer');
        setTimeout(() => this.celebration()?.nativeElement.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }));
      }
      wasFinished = finished;
    });
  }

  protected withCharacter(step: RoutineStepDTO): boolean {
    return !!routineIcon(step.icone).withCharacter;
  }

  /** Numéro et case à cocher : la teinte de la ligne, en plus franc. */
  protected strong(step: RoutineStepDTO): string {
    return vivid(isHexColor(step.couleur) ? step.couleur : '#dbeafe');
  }

  protected onToggle(step: RoutineStepDTO): void {
    if (!this.checked().has(step.id!)) {
      this.sound.play('check');
      const burst = { id: nextBurst++, stepId: step.id! };
      this.bursts.update((b) => [...b, burst]);
      setTimeout(() => this.bursts.update((b) => b.filter((x) => x !== burst)), 900);
    }
    this.toggle.emit(step.id!);
  }

  protected burstsOf(stepId: number): Burst[] {
    return this.bursts().filter((b) => b.stepId === stepId);
  }
}
