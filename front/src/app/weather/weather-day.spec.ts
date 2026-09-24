import { TestBed } from '@angular/core/testing';
import { MeteoJourDTO } from '../api-client';
import { WeatherDay } from './weather-day';

const jour = (overrides: Partial<MeteoJourDTO> = {}): MeteoJourDTO => ({
  date: '2026-09-24',
  ciel: 'ECLAIRCIES',
  temperatureMin: 9.4,
  temperatureMax: 19.6,
  ressentiMatin: 8.2,
  ressentiJournee: 18.4,
  risquePluie: 30,
  tenue: ['T_SHIRT', 'PULL', 'VESTE', 'PANTALON'],
  superposer: true,
  ...overrides,
});

function render(day: MeteoJourDTO, highlighted = false): HTMLElement {
  const fixture = TestBed.createComponent(WeatherDay);
  fixture.componentRef.setInput('day', day);
  fixture.componentRef.setInput('label', 'Aujourd’hui');
  fixture.componentRef.setInput('highlighted', highlighted);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('WeatherDay', () => {
  it('affiche une tuile emoji + libellé par vêtement, dans l’ordre', () => {
    const el = render(jour());

    const tiles = [...el.querySelectorAll('.tile')].map((t) => [
      t.querySelector('.tile-emoji')!.textContent,
      t.querySelector('.tile-label')!.textContent,
    ]);
    expect(tiles).toEqual([
      ['👕', 'T-shirt'],
      ['👚', 'Pull'],
      ['🧥', 'Veste'],
      ['👖', 'Pantalon'],
    ]);
    expect(el.querySelector('.day-name')!.textContent).toContain('Aujourd’hui');
    expect(el.querySelector('.max')!.textContent).toBe('20°');
    expect(el.querySelector('.sky')!.getAttribute('aria-label')).toBe('Éclaircies');
  });

  it('affiche la phrase « on pourra enlever le pull » seulement si superposer', () => {
    expect(render(jour()).querySelector('.layers')!.textContent).toContain('on pourra enlever le pull');
    expect(render(jour({ superposer: false })).querySelector('.layers')).toBeNull();
  });

  it('met la journée en évidence si demandé', () => {
    expect(render(jour(), true).classList).toContain('highlighted');
    expect(render(jour(), false).classList).not.toContain('highlighted');
  });
});
