/*
 * Registre des mini-jeux de récompense.
 *
 * Ajouter un jeu : créer son composant standalone (il injecte GAME_CONTEXT : membre, sons, finish()), puis ajouter
 * une entrée ci-dessous. La fenêtre de récompense propose jusqu'à 3 jeux tirés au hasard.
 */
import { BubblesGame } from './bubbles-game';
import { MiniGame } from './mini-game';

export const MINI_GAMES: MiniGame[] = [
  {
    id: 'bubbles',
    name: $localize`:@@game.bubbles:Éclate les bulles`,
    duration: 30,
    icon: 'shower',
    component: BubblesGame,
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
