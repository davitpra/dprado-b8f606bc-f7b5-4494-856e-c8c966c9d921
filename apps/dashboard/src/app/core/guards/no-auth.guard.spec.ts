import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { noAuthGuard } from './no-auth.guard';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';
import { createMockAuthStore } from '../../testing/mock-stores';

describe('noAuthGuard', () => {
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
      noAuthGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('redirects to /app/tasks when already authenticated', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    await run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('redirects to /app/tasks when not authenticated but restore succeeds', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthService.initializeFromStorage.mockResolvedValue(true);
    await run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('returns true when not authenticated and restore fails', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthService.initializeFromStorage.mockResolvedValue(false);
    expect(await run()).toBe(true);
  });
});
