import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpContext } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MeteoDTO, MeteoJourDTO, MeteoService } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { parseIsoDate } from '../shared/date-utils';
import { WeatherDay } from './weather-day';
import { TODAY_LABEL, TOMORROW_LABEL } from './weather-labels';

const WEEK_DAYS = 7;

interface LabelledDay {
  day: MeteoJourDTO;
  label: string;
}

/** Météo et tenue conseillée des 7 prochains jours (aujourd'hui compris). */
@Component({
  selector: 'app-week-weather-dialog',
  imports: [MatDialogModule, MatButtonModule, MatProgressBarModule, WeatherDay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './week-weather-dialog.html',
  styleUrl: './week-weather-dialog.scss',
})
export class WeekWeatherDialog {
  private readonly meteoApi = inject(MeteoService);
  private readonly datePipe = new DatePipe(inject(LOCALE_ID));

  /** L'erreur est affichée dans le dialogue : pas de snack-bar. */
  protected readonly meteo = rxResource<MeteoDTO, void>({
    stream: () =>
      this.meteoApi.getMeteo(WEEK_DAYS, 'body', false, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      }),
  });

  /** Le backend renvoie les jours à partir d'aujourd'hui : « Aujourd'hui », « Demain », puis « Samedi 26 sept. »… */
  protected readonly days = computed<LabelledDay[]>(() =>
    this.meteo.hasValue()
      ? (this.meteo.value().jours ?? []).map((day, i) => ({ day, label: this.label(i, day.date!) }))
      : [],
  );

  private label(index: number, isoDate: string): string {
    if (index === 0) {
      return TODAY_LABEL;
    }
    if (index === 1) {
      return TOMORROW_LABEL;
    }
    const name = this.datePipe.transform(parseIsoDate(isoDate), 'EEEE d MMM') ?? isoDate;
    return name.charAt(0).toLocaleUpperCase() + name.slice(1);
  }
}
