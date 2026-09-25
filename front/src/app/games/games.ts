/*
 * Registre des mini-jeux de récompense.
 *
 * Ajouter un jeu : créer son composant standalone (il injecte GAME_CONTEXT : membre, finish() ; SoundService pour les
 * sons, coupés par défaut), puis ajouter
 * une entrée ci-dessous. La fenêtre de récompense propose jusqu'à 3 jeux tirés au hasard.
 */
import { BubblesGame } from './bubbles-game';
import { CatchStarsGame } from './catch-stars-game';
import { MemoryGame } from './memory-game';
import { MiniGame } from './mini-game';
import { PuzzleGame } from './puzzle-game';

export const MINI_GAMES: MiniGame[] = [
  {
    id: 'bubbles',
    name: $localize`:@@game.bubbles:Éclate les bulles`,
    duration: 30,
    icon: 'shower',
    component: BubblesGame,
  },
  {
    id: 'memory',
    name: $localize`:@@game.memory:Memory`,
    duration: 60,
    icon: 'toys',
    component: MemoryGame,
  },
  {
    id: 'stars',
    name: $localize`:@@game.stars:Attrape les étoiles`,
    duration: 40,
    icon: 'moon',
    component: CatchStarsGame,
  },
  {
    id: 'puzzle',
    name: $localize`:@@game.puzzle:Puzzle de mon personnage`,
    duration: 30,
    icon: 'clothes',
    component: PuzzleGame,
  },
];

/** Jusqu'à `count` jeux tirés au hasard, sans doublon. */
export function pickGames(count: number, random: () => number = Math.random, games: MiniGame[] = MINI_GAMES): MiniGame[] {
  const pool = [...games];
  const picked: MiniGame[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return picked;
}
