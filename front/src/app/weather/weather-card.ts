import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { PercentPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MeteoDTO, MeteoService } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { WEATHER_LABELS } from './weather-labels';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

/** Météo d'aujourd'hui et de demain, et la tenue conseillée pour les enfants. */
@Component({
  selector: 'app-weather-card',
  imports: [PercentPipe, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.scss',
})
export class WeatherCard {
  private readonly meteoApi = inject(MeteoService);

  /** L'erreur est affichée dans la carte : pas de snack-bar, notamment à chaque rechargement automatique. */
  protected readonly meteo = rxResource<MeteoDTO, void>({
    stream: () =>
      this.meteoApi.getMeteo('body', false, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      }),
  });

  protected readonly labels = WEATHER_LABELS;

  constructor() {
    const timer = setInterval(() => this.meteo.reload(), REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /** Température arrondie au degré (« -0 » affiché « 0 »). */
  protected degrees(value: number | null | undefined): string {
    return value == null ? '–' : `${Math.round(value) || 0}°`;
  }
}
