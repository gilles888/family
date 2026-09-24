import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { MeteoJourDTO } from '../api-client';
import { WEATHER_LABELS } from './weather-labels';

/** Une journée : ciel, températures, ressenti du matin, risque de pluie et tuiles de la tenue conseillée. */
@Component({
  selector: 'app-weather-day',
  imports: [PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weather-day.html',
  styleUrl: './weather-day.scss',
  host: { '[class.highlighted]': 'highlighted()' },
})
export class WeatherDay {
  readonly day = input.required<MeteoJourDTO>();
  readonly label = input.required<string>();
  readonly highlighted = input(false);

  protected readonly labels = WEATHER_LABELS;

  /** Température arrondie au degré (« -0 » affiché « 0 »). */
  protected degrees(value: number | null | undefined): string {
    return value == null ? '–' : `${Math.round(value) || 0}°`;
  }
}
