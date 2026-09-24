import { TestBed } from '@angular/core/testing';
import { HttpContext } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MeteoDTO, MeteoJourDTO, MeteoService } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { WeekWeatherDialog } from './week-weather-dialog';

const semaine: MeteoDTO = {
  lieu: 'Bruxelles',
  jours: Array.from({ length: 7 }, (_, i): MeteoJourDTO => ({
    date: `2026-09-${24 + i}`,
    ciel: 'SOLEIL',
    temperatureMin: 10 + i,
    temperatureMax: 20 + i,
    tenue: ['T_SHIRT', 'PANTALON'],
    superposer: false,
  })),
};

describe('WeekWeatherDialog', () => {
  it('affiche les 7 jours, libellés Aujourd’hui / Demain puis le nom du jour', async () => {
    const getMeteo = vi.fn(() => of(semaine));
    TestBed.configureTestingModule({
      providers: [
        { provide: MeteoService, useValue: { getMeteo } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(WeekWeatherDialog);
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const labels = [...el.querySelectorAll('app-weather-day .day-name')].map((h) => h.textContent!.trim());
    expect(labels).toHaveLength(7);
    expect(labels.slice(0, 2)).toEqual(['Aujourd\'hui', 'Demain']);
    expect(labels[2]).toMatch(/^\p{Lu}.*26/u); // nom du jour capitalisé, ex. « Saturday 26 Sep » (locale de test)
    expect(el.querySelector('app-weather-day')!.classList).toContain('highlighted');
    expect(el.querySelectorAll('app-weather-day.highlighted')).toHaveLength(1);
    expect(el.querySelector('.place')!.textContent).toContain('Bruxelles');

    const [jours, , , options] = getMeteo.mock.calls[0] as unknown as [number, string, boolean, { context: HttpContext }];
    expect(jours).toBe(7);
    expect(options.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
  });
});
