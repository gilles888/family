import { InjectionToken, Type } from '@angular/core';
import { FamilyMemberDTO } from '../api-client';

/** Un mini-jeu de récompense : court (30 à 60 s), sans échec, qui finit toujours sur « Bravo ! ». */
export interface MiniGame {
  id: string;
  /** Nom affiché (traduit). */
  name: string;
  /** Durée indicative, en secondes. */
  duration: number;
  /** Illustration du catalogue des routines, pour la carte de choix. */
  icon: string;
  /** Composant standalone du jeu, créé par NgComponentOutlet : il lit GAME_CONTEXT. */
  component: Type<unknown>;
}

/** Ce que la fenêtre de récompense donne au jeu. */
export interface GameContext {
  /** L'enfant : son avatar devient le héros du jeu. */
  member: FamilyMemberDTO;
  /** Fin de partie : la fenêtre affiche « Bravo ! » (score facultatif, jamais un échec). */
  finish(score?: number): void;
}

export const GAME_CONTEXT = new InjectionToken<GameContext>('GAME_CONTEXT');
