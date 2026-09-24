export * from './agenda.service';
import { AgendaService } from './agenda.service';
export * from './membres.service';
import { MembresService } from './membres.service';
export * from './meteo.service';
import { MeteoService } from './meteo.service';
export * from './reminders.service';
import { RemindersService } from './reminders.service';
export const APIS = [AgendaService, MembresService, MeteoService, RemindersService];
