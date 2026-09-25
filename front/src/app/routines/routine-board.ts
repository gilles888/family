import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FamilyMemberDTO, RoutineDTO, RoutineStepDTO } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { isHexColor, vivid } from '../shared/svg/shapes';
import { RoutineIllustration } from './routine-icon';
import { routineIcon } from './routine-icons';
import { progress } from './routine-logic';

interface Burst {
  id: number;
  stepId: number;
}

let nextBurst = 0;

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
  styleUrl: './routine-board.scss',
  host: {
    '[class.night]': "routine().theme === 'NIGHT'",
  },
})
export class RoutineBoard {
  readonly routine = input.required<RoutineDTO>();
  readonly member = input<FamilyMemberDTO | undefined>();
  readonly toggle = output<number>();

  protected readonly confetti = CONFETTI;
  protected readonly bursts = signal<Burst[]>([]);

  protected readonly steps = computed(() => this.routine().etapes ?? []);
  protected readonly checked = computed(() => new Set(this.routine().etat?.etapesCochees ?? []));
  protected readonly progress = computed(() => progress(this.routine()));
  protected readonly percent = computed(() => {
    const { done, total } = this.progress();
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  protected withCharacter(step: RoutineStepDTO): boolean {
    return !!routineIcon(step.icone).withCharacter;
  }

  /** Numéro et case à cocher : la teinte de la ligne, en plus franc. */
  protected strong(step: RoutineStepDTO): string {
    return vivid(isHexColor(step.couleur) ? step.couleur : '#dbeafe');
  }

  protected onToggle(step: RoutineStepDTO): void {
    if (!this.checked().has(step.id!)) {
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
