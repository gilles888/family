import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MeteoDTO, MeteoService } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { WeatherDay } from './weather-day';
import { TODAY_LABEL, TOMORROW_LABEL } from './weather-labels';
import { WeekWeatherDialog } from './week-weather-dialog';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
/** Aujourd'hui et demain. */
const CARD_DAYS = 2;

/** Météo d'aujourd'hui et de demain, et la tenue conseillée pour les enfants. */
@Component({
  selector: 'app-weather-card',
  imports: [MatButtonModule, MatIconModule, WeatherDay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.scss',
})
export class WeatherCard {
  private readonly meteoApi = inject(MeteoService);
  private readonly dialog = inject(MatDialog);

  /** L'erreur est affichée dans la carte : pas de snack-bar, notamment à chaque rechargement automatique. */
  protected readonly meteo = rxResource<MeteoDTO, void>({
    stream: () =>
      this.meteoApi.getMeteo(CARD_DAYS, 'body', false, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      }),
  });

  protected readonly todayLabel = TODAY_LABEL;
  protected readonly tomorrowLabel = TOMORROW_LABEL;

  constructor() {
    const timer = setInterval(() => this.meteo.reload(), REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected openWeek(): void {
    this.dialog.open(WeekWeatherDialog, { width: '720px', maxWidth: '95vw' });
  }
}
