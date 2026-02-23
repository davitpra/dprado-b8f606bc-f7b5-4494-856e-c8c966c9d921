import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';
import { createMockAuthStore } from '../../testing/mock-stores';

describe('authGuard', () => {
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockAuthService: { initializeFromStorage: jest.Mock };
  let router: Router;

  beforeEach(() => {
    mockAuthStore = createMockAuthStore();
    mockAuthService = { initializeFromStorage: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: { createUrlTree: jest.fn((path: string[]) => ({ path })) } },
      ],
    });

    router = TestBed.inject(Router);
  });

  const run = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('returns true when already authenticated', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    expect(await run()).toBe(true);
    expect(mockAuthService.initializeFromStorage).not.toHaveBeenCalled();
  });

  it('returns true when not authenticated but initializeFromStorage restores session', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthService.initializeFromStorage.mockResolvedValue(true);
    expect(await run()).toBe(true);
  });

  it('redirects to /auth/login when not authenticated and restore fails', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthService.initializeFromStorage.mockResolvedValue(false);
    await run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});
