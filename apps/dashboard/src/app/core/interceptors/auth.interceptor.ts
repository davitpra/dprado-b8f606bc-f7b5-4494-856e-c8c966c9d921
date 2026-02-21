import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

const PUBLIC_URLS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (PUBLIC_URLS.some((url) => req.url.includes(url))) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401(authReq, next, authService);
      }
      return throwError(() => error);
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return new Observable<HttpEvent<unknown>>((subscriber) => {
      authService
        .refreshToken()
        .then((tokens) => {
          isRefreshing = false;
          refreshTokenSubject.next(tokens.access_token);
          next(addToken(req, tokens.access_token)).subscribe(subscriber);
        })
        .catch(() => {
          isRefreshing = false;
          refreshTokenSubject.next(null);
          authService.logout();
          subscriber.error(new HttpErrorResponse({ status: 401 }));
        });
    });
  }

  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => next(addToken(req, token))),
  );
}
