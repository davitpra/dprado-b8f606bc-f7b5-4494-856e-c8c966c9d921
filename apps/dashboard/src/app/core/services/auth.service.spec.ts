import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthStore } from '../stores/auth.store';
import { ToastService } from './toast.service';
import { makeUser, makeUserRole } from '../../testing/test-fixtures';
import { UserRole } from '@task-management/data';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockAuthStore: jest.Mocked<Pick<AuthStore, 'setLoading' | 'setError' | 'setAuthResponse' | 'setTokens' | 'clearAuth'>>;
  let mockToastService: { success: jest.Mock; error: jest.Mock; warning: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  const mockTokens = { access_token: 'access-token-123', refresh_token: 'refresh-token-456' };
  const mockMe = { user: makeUser(), roles: [makeUserRole({ role: UserRole.ADMIN })] };

  beforeEach(() => {
    mockAuthStore = {
      setLoading: jest.fn(),
      setError: jest.fn(),
      setAuthResponse: jest.fn(),
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    };
    mockToastService = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
    mockRouter = { navigate: jest.fn() };

    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login()', () => {
    it('POSTs to /api/auth/login then GETs /api/auth/me on success', async () => {
      const loginPromise = service.login('test@example.com', 'Password123!');

      httpMock.expectOne('/api/auth/login').flush(mockTokens);
      await Promise.resolve(); // allow microtasks to flush
      httpMock.expectOne('/api/auth/me').flush(mockMe);
      await loginPromise;

      expect(mockAuthStore.setAuthResponse).toHaveBeenCalledWith(
        mockMe.user,
        mockMe.roles,
        mockTokens,
      );
    });

    it('saves tokens to localStorage on success', async () => {
      const loginPromise = service.login('test@example.com', 'Password123!');
      httpMock.expectOne('/api/auth/login').flush(mockTokens);
      await Promise.resolve();
      httpMock.expectOne('/api/auth/me').flush(mockMe);
      await loginPromise;

      expect(localStorage.getItem('access_token')).toBe('access-token-123');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-token-456');
    });

    it('calls setLoading(true) then setLoading(false)', async () => {
      const loginPromise = service.login('test@example.com', 'Password123!');
      httpMock.expectOne('/api/auth/login').flush(mockTokens);
      await Promise.resolve();
      httpMock.expectOne('/api/auth/me').flush(mockMe);
      await loginPromise;

      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(true);
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false);
    });

    it('calls setError(null) at start', async () => {
      const loginPromise = service.login('test@example.com', 'Password123!');
      httpMock.expectOne('/api/auth/login').flush(mockTokens);
      await Promise.resolve();
      httpMock.expectOne('/api/auth/me').flush(mockMe);
      await loginPromise;

      expect(mockAuthStore.setError).toHaveBeenCalledWith(null);
    });

    it('calls setError and toastService.error on failure, then rethrows', async () => {
      const loginPromise = service.login('test@example.com', 'bad');

      httpMock.expectOne('/api/auth/login').flush(
        { message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );

      await expect(loginPromise).rejects.toBeTruthy();
      expect(mockAuthStore.setError).toHaveBeenCalledWith(expect.stringContaining('credentials'));
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('register()', () => {
    const registerData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password123!',
      organizationName: 'Acme',
    };

    it('POSTs to /api/auth/register then GETs /api/auth/me on success', async () => {
      const regPromise = service.register(registerData);

      httpMock.expectOne('/api/auth/register').flush(mockTokens);
      await Promise.resolve();
      httpMock.expectOne('/api/auth/me').flush(mockMe);
      await regPromise;

      expect(mockAuthStore.setAuthResponse).toHaveBeenCalledWith(
        mockMe.user,
        mockMe.roles,
        mockTokens,
      );
    });

    it('calls setError and toastService.error on failure', async () => {
      const regPromise = service.register(registerData);

      httpMock.expectOne('/api/auth/register').flush(
        { message: 'Email already in use' },
        { status: 409, statusText: 'Conflict' },
      );

      await expect(regPromise).rejects.toBeTruthy();
      expect(mockAuthStore.setError).toHaveBeenCalledWith(expect.stringContaining('Email'));
    });
  });

  describe('logout()', () => {
    it('removes tokens from localStorage', () => {
      localStorage.setItem('access_token', 'at');
      localStorage.setItem('refresh_token', 'rt');
      service.logout();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('calls authStore.clearAuth', () => {
      service.logout();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });

    it('navigates to /auth/login', () => {
      service.logout();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('isTokenExpired()', () => {
    it('returns true for an expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      const payload = btoa(JSON.stringify({ exp: pastExp }));
      const token = `header.${payload}.sig`;
      expect(service.isTokenExpired(token)).toBe(true);
    });

    it('returns false for a future token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const token = `header.${payload}.sig`;
      expect(service.isTokenExpired(token)).toBe(false);
    });

    it('returns true for a malformed token', () => {
      expect(service.isTokenExpired('not-a-valid-jwt')).toBe(true);
    });
  });

  describe('getAccessToken()', () => {
    it('returns null when no token in localStorage', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('returns token when set in localStorage', () => {
      localStorage.setItem('access_token', 'my-token');
      expect(service.getAccessToken()).toBe('my-token');
    });
  });
});
