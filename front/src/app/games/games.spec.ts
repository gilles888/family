import { Component } from '@angular/core';
import { MiniGame } from './mini-game';
import { pickGames } from './games';

@Component({ template: '' })
class FakeGame {}

const GAMES: MiniGame[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, duration: 30, icon: 'finish', component: FakeGame }));

describe('pickGames', () => {
  it('tire le nombre demandé, sans doublon', () => {
    const picked = pickGames(3, Math.random, GAMES);

    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((g) => g.id)).size).toBe(3);
  });

  it('jamais plus que les jeux disponibles', () => {
    expect(pickGames(3, Math.random, GAMES.slice(0, 2))).toHaveLength(2);
  });
});
