import { Injectable, signal } from '@angular/core';

const KEY = 'family-agenda.sound';

export type SoundEffect = 'pop' | 'check' | 'cheer' | 'catch';

/** Notes (Hz) et durées (s) de chaque effet : des « bips » doux générés, aucun fichier audio. */
const EFFECTS: Record<SoundEffect, [number, number][]> = {
  pop: [[880, 0.07]],
  check: [[660, 0.08], [990, 0.1]],
  catch: [[1046, 0.08]],
  cheer: [[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.25]],
};

/**
 * Sons des routines et des mini-jeux, **coupés par défaut** (bouton muet visible). Le choix est gardé dans le
 * navigateur. Web Audio : pas de fichier à charger.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  readonly enabled = signal(read() === 'on');
  private context: AudioContext | null = null;

  toggle(): void {
    this.enabled.update((on) => !on);
    try {
      localStorage.setItem(KEY, this.enabled() ? 'on' : 'off');
    } catch {
      // stockage indisponible : le choix vaut pour cette session
    }
  }

  play(effect: SoundEffect): void {
    if (!this.enabled() || typeof AudioContext === 'undefined') {
      return;
    }
    this.context ??= new AudioContext();
    let at = this.context.currentTime;
    for (const [frequency, duration] of EFFECTS[effect]) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.02);
      at += duration * 0.8;
    }
  }
}

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
