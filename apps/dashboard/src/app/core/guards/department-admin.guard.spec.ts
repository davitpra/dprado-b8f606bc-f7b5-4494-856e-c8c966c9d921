import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { departmentAdminGuard } from './department-admin.guard';
import { AuthStore } from '../stores/auth.store';
import { createMockAuthStore } from '../../testing/mock-stores';

const makeRoute = (id: string | null): ActivatedRouteSnapshot => ({
  paramMap: { get: (key: string) => (key === 'id' ? id : null) },
} as unknown as ActivatedRouteSnapshot);

describe('departmentAdminGuard', () => {
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

  const run = (route: ActivatedRouteSnapshot) =>
    TestBed.runInInjectionContext(() =>
      departmentAdminGuard(route, {} as RouterStateSnapshot),
    );

  it('redirects to /app/tasks when route has no :id param', () => {
    run(makeRoute(null));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('returns true when user is admin in the department', () => {
    mockAuthStore.isAdminInDepartment.mockReturnValue(true);
    expect(run(makeRoute('dept-1'))).toBe(true);
    expect(mockAuthStore.isAdminInDepartment).toHaveBeenCalledWith('dept-1');
  });

  it('redirects to /app/tasks when user is not admin in the department', () => {
    mockAuthStore.isAdminInDepartment.mockReturnValue(false);
    run(makeRoute('dept-1'));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('passes the correct departmentId from the route param', () => {
    mockAuthStore.isAdminInDepartment.mockReturnValue(true);
    run(makeRoute('dept-99'));
    expect(mockAuthStore.isAdminInDepartment).toHaveBeenCalledWith('dept-99');
  });
});
