import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Prepends environment.apiUrl to all relative /api/* requests.
 *
 * - Development: apiUrl is '' → URLs stay relative; the dev proxy handles routing.
 * - Production (same domain): apiUrl is '' → relative URLs work with Nginx reverse proxy.
 * - Production (separate domains): set apiUrl to 'https://api.your-domain.com' in
 *   environment.prod.ts to rewrite all requests to the correct origin.
 */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.apiUrl && req.url.startsWith('/')) {
    return next(req.clone({ url: environment.apiUrl + req.url }));
  }
  return next(req);
};
