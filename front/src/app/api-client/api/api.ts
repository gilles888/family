export * from './agenda.service';
import { AgendaService } from './agenda.service';
export * from './membres.service';
import { MembresService } from './membres.service';
export * from './reminders.service';
import { RemindersService } from './reminders.service';
export const APIS = [AgendaService, MembresService, RemindersService];
