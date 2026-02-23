import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { adminOrOwnerGuard } from './admin-or-owner.guard';
import { AuthStore } from '../stores/auth.store';
import { UserRole } from '@task-management/data';
import { createMockAuthStore } from '../../testing/mock-stores';
import { makeUserRole } from '../../testing/test-fixtures';

describe('adminOrOwnerGuard', () => {
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let router: Router;

  beforeEach(() => {
    mockAuthStore = createMockAuthStore();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: { createUrlTree: jest.fn((path: string[]) => ({ path })) } },
      ],
    });

    router = TestBed.inject(Router);
  });

  const run = () =>
    TestBed.runInInjectionContext(() =>
      adminOrOwnerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('returns true when user is owner', () => {
    mockAuthStore.isOwner.mockReturnValue(true);
    mockAuthStore.userRoles.mockReturnValue([]);
    expect(run()).toBe(true);
  });

  it('returns true when user has at least one ADMIN role', () => {
    mockAuthStore.isOwner.mockReturnValue(false);
    mockAuthStore.userRoles.mockReturnValue([
      makeUserRole({ role: UserRole.ADMIN, departmentId: 'dept-1' }),
    ]);
    expect(run()).toBe(true);
  });

  it('redirects to /app/tasks when user is viewer (no admin role)', () => {
    mockAuthStore.isOwner.mockReturnValue(false);
    mockAuthStore.userRoles.mockReturnValue([
      makeUserRole({ role: UserRole.VIEWER, departmentId: 'dept-1' }),
    ]);
    run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('redirects to /app/tasks when user has no roles at all', () => {
    mockAuthStore.isOwner.mockReturnValue(false);
    mockAuthStore.userRoles.mockReturnValue([]);
    run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/tasks']);
  });
});
