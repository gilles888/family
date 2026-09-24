import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiErrorInterceptor, SKIP_ERROR_NOTIFICATION } from './api-error.interceptor';
import { NotificationService } from './notification.service';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let errors: string[];

  beforeEach(() => {
    errors = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { error: (m: string) => errors.push(m) } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  function failWith503(context?: HttpContext): unknown {
    let received: unknown;
    http.get('/v1/meteo', { context }).subscribe({ error: (e) => (received = e) });
    backend.expectOne('/v1/meteo').flush(null, { status: 503, statusText: 'Service Unavailable' });
    return received;
  }

  it('notifie les erreurs par défaut et les relance', () => {
    expect(failWith503()).toBeTruthy();
    expect(errors).toHaveLength(1);
  });

  it('ne notifie pas si SKIP_ERROR_NOTIFICATION est posé, mais relance l’erreur', () => {
    expect(failWith503(new HttpContext().set(SKIP_ERROR_NOTIFICATION, true))).toBeTruthy();
    expect(errors).toHaveLength(0);
  });
});
