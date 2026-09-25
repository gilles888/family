import { Injectable, inject } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { MeteoDTO, MeteoService } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';

/** Au-delà, la prévision est rechargée (le backend la garde lui-même 30 min en cache). */
export const WEATHER_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
/** Aujourd'hui et demain. */
const CARD_DAYS = 2;

/**
 * Météo de la carte « Comment s'habiller ? », partagée par toutes ses instances (page principale et page Mobile) :
 * un seul appel à l'API, quel que soit le nombre de cartes affichées.
 */
@Injectable({ providedIn: 'root' })
export class WeatherStore {
  private readonly meteoApi = inject(MeteoService);
  private loadedAt = Date.now();

  /** L'erreur est affichée dans la carte : pas de snack-bar, notamment à chaque rechargement automatique. */
  readonly meteo = rxResource<MeteoDTO, void>({
    stream: () => {
      this.loadedAt = Date.now();
      return this.meteoApi.getMeteo(CARD_DAYS, 'body', false, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      });
    },
  });

  /** Recharge la prévision si elle date de plus de 30 min. */
  refreshIfStale(): void {
    if (Date.now() - this.loadedAt >= WEATHER_REFRESH_INTERVAL_MS) {
      this.meteo.reload();
    }
  }
}
