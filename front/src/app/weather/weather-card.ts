import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { WeatherDay } from './weather-day';
import { TODAY_LABEL, TOMORROW_LABEL } from './weather-labels';
import { WeekWeatherDialog } from './week-weather-dialog';
import { WEATHER_REFRESH_INTERVAL_MS, WeatherStore } from './weather-store';

/** Météo d'aujourd'hui et de demain, et la tenue conseillée pour les enfants. */
@Component({
  selector: 'app-weather-card',
  imports: [MatButtonModule, MatIconModule, WeatherDay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.scss',
})
export class WeatherCard {
  private readonly store = inject(WeatherStore);
  private readonly dialog = inject(MatDialog);

  /** Prévision partagée entre les cartes (un seul appel à l'API). */
  protected readonly meteo = this.store.meteo;

  protected readonly todayLabel = TODAY_LABEL;
  protected readonly tomorrowLabel = TOMORROW_LABEL;

  constructor() {
    this.store.refreshIfStale();
    const timer = setInterval(() => this.store.refreshIfStale(), WEATHER_REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected openWeek(): void {
    this.dialog.open(WeekWeatherDialog, { width: '720px', maxWidth: '95vw' });
  }
}
