import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { DateAdapter, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS } from '@angular/material/core';
import { provideApi } from './api-client';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { apiErrorInterceptor } from './shared/api-error.interceptor';
import { LocaleDateAdapter } from './shared/locale-date-adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiErrorInterceptor])),
    // Client OpenAPI généré : le basePath vient de environment(.prod).ts
    provideApi(environment.apiBasePath),
    // Date/heure Material : la locale (fr / nl) suit LOCALE_ID du build localisé ; la saisie est lue jj/mm/aaaa
    { provide: DateAdapter, useClass: LocaleDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
  ],
};
