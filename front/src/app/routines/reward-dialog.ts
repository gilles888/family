import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FamilyMemberDTO, RoutineDTO, RoutineRunDTO, RoutinesService } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { pickGames } from '../games/games';
import { GAME_CONTEXT, GameContext, MiniGame } from '../games/mini-game';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { SoundService } from '../shared/sound.service';
import { RoutineIllustration } from './routine-icon';

export interface RewardData {
  routine: RoutineDTO;
  member: FamilyMemberDTO;
  /** Jour de la routine (ISO). */
  date: string;
}

type Phase = 'choose' | 'starting' | 'playing' | 'done' | 'already';

/**
 * Récompense d'une routine terminée : choix parmi 3 mini-jeux tirés au hasard (ou lancement direct s'il n'y en a
 * qu'un), une seule partie par routine et par jour (le serveur la marque jouée au lancement), fin douce « Bravo ! ».
 * Se ferme avec l'état du jour mis à jour.
 */
@Component({
  selector: 'app-reward-dialog',
  imports: [NgComponentOutlet, MatButtonModule, MatDialogModule, MatIconModule, Avatar, RoutineIllustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reward-dialog.html',
  styleUrl: './reward-dialog.scss',
})
export class RewardDialog {
  private readonly api = inject(RoutinesService);
  private readonly dialogRef = inject(MatDialogRef<RewardDialog, RoutineRunDTO>);
  private readonly injector = inject(Injector);
  protected readonly sound = inject(SoundService);
  protected readonly data = inject<RewardData>(MAT_DIALOG_DATA);

  protected readonly choices = pickGames(3);
  protected readonly phase = signal<Phase>('choose');
  protected readonly game = signal<MiniGame | null>(null);
  protected readonly score = signal<number | null>(null);
  private run: RoutineRunDTO | undefined;

  private readonly context: GameContext = {
    member: this.data.member,
    sound: () => this.sound.enabled(),
    finish: (score) => {
      this.score.set(score ?? null);
      this.phase.set('done');
      this.sound.play('cheer');
    },
  };
  protected readonly gameInjector = Injector.create({ providers: [{ provide: GAME_CONTEXT, useValue: this.context }], parent: this.injector });

  protected readonly title = computed(() => this.game()?.name ?? '');

  constructor() {
    this.dialogRef.disableClose = true; // on ferme par le bouton (et on renvoie l'état du jour)
    if (this.choices.length === 1) {
      this.start(this.choices[0]);
    }
  }

  protected start(game: MiniGame): void {
    this.phase.set('starting');
    this.api
      .jouerRecompenseRoutine(this.data.routine.id!, this.data.date, 'body', false, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      })
      .subscribe({
        next: (run) => {
          this.run = run;
          this.game.set(game);
          this.phase.set('playing');
        },
        error: (e: HttpErrorResponse) => this.phase.set(e.status === 409 ? 'already' : 'choose'),
      });
  }

  protected close(): void {
    this.dialogRef.close(this.run ?? (this.phase() === 'already' ? { ...this.data.routine.etat, recompenseJouee: true } : undefined));
  }
}
