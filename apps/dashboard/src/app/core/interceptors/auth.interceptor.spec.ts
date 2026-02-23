import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockAuthService: {
    getAccessToken: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    mockAuthService = {
      getAccessToken: jest.fn().mockReturnValue(null),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Authorization header when token is available', () => {
    mockAuthService.getAccessToken.mockReturnValue('my-token');

    httpClient.get('/api/tasks').subscribe();

    const req = httpMock.expectOne('/api/tasks');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush([]);
  });

  it('does NOT add Authorization header when no token', () => {
    mockAuthService.getAccessToken.mockReturnValue(null);

    httpClient.get('/api/tasks').subscribe();

    const req = httpMock.expectOne('/api/tasks');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  describe('public URLs are not modified', () => {
    const publicUrls = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

    publicUrls.forEach((url) => {
      it(`does not add header for ${url}`, () => {
        mockAuthService.getAccessToken.mockReturnValue('my-token');

        httpClient.post(url, {}).subscribe();

        const req = httpMock.expectOne(url);
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({});
      });
    });
  });

  describe('401 handling', () => {
    it('calls refreshToken() and retries request with new token on 401', (done) => {
      const newTokens = { access_token: 'new-token', refresh_token: 'new-refresh' };
      mockAuthService.getAccessToken.mockReturnValue('old-token');
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      httpClient.get('/api/tasks').subscribe({
        next: () => {
          expect(mockAuthService.refreshToken).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });

      // Original request fails with 401
      const req1 = httpMock.expectOne('/api/tasks');
      req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      // After refresh, retry is made
      setTimeout(() => {
        const req2 = httpMock.expectOne('/api/tasks');
        expect(req2.request.headers.get('Authorization')).toBe('Bearer new-token');
        req2.flush([]);
      }, 50);
    });
  });
});
