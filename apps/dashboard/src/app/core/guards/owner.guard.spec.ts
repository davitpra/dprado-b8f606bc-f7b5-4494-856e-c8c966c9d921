import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { ownerGuard } from './owner.guard';
import { AuthStore } from '../stores/auth.store';
import { createMockAuthStore } from '../../testing/mock-stores';

describe('ownerGuard', () => {
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
      ownerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('returns true when user is owner', () => {
    mockAuthStore.isOwner.mockReturnValue(true);
    expect(run()).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to /app/tasks when user is not owner', () => {
    mockAuthStore.isOwner.mockReturnValue(false);
    run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/tasks']);
  });
});
