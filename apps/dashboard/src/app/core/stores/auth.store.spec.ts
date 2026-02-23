import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { UserRole } from '@task-management/data';
import { makeUser, makeUserRole } from '../../testing/test-fixtures';

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
  });

  describe('initial state', () => {
    it('isAuthenticated is false', () => {
      expect(store.isAuthenticated()).toBe(false);
    });

    it('isOwner is false', () => {
      expect(store.isOwner()).toBe(false);
    });

    it('user is null', () => {
      expect(store.user()).toBeNull();
    });

    it('currentUserName is null', () => {
      expect(store.currentUserName()).toBeNull();
    });

    it('displayRole is null', () => {
      expect(store.displayRole()).toBeNull();
    });
  });

  describe('setAuthResponse', () => {
    it('sets user, roles, and tokens', () => {
      const user = makeUser();
      const roles = [makeUserRole({ role: UserRole.ADMIN })];
      const tokens = { access_token: 'at', refresh_token: 'rt' };

      store.setAuthResponse(user, roles, tokens);

      expect(store.user()).toEqual(user);
      expect(store.userRoles()).toEqual(roles);
      expect(store.accessToken()).toBe('at');
      expect(store.isAuthenticated()).toBe(true);
    });

    it('clears previous error', () => {
      store.setError('some error');
      store.setAuthResponse(makeUser(), [], { access_token: 'at', refresh_token: 'rt' });
      expect(store.error()).toBeNull();
    });
  });

  describe('isOwner', () => {
    it('returns true when user.isOwner is true', () => {
      store.setAuthResponse(
        makeUser({ isOwner: true }),
        [],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.isOwner()).toBe(true);
    });

    it('returns false when user.isOwner is false', () => {
      store.setAuthResponse(
        makeUser({ isOwner: false }),
        [],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.isOwner()).toBe(false);
    });
  });

  describe('currentUserName', () => {
    it('returns "First Last" when user is set', () => {
      store.setAuthResponse(
        makeUser({ firstName: 'John', lastName: 'Doe' }),
        [],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.currentUserName()).toBe('John Doe');
    });
  });

  describe('displayRole', () => {
    it('returns Owner when isOwner is true', () => {
      store.setAuthResponse(
        makeUser({ isOwner: true }),
        [],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.displayRole()).toBe('Owner');
    });

    it('returns Admin when userRoles contains ADMIN', () => {
      store.setAuthResponse(
        makeUser(),
        [makeUserRole({ role: UserRole.ADMIN })],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.displayRole()).toBe('Admin');
    });

    it('returns Viewer when userRoles contains VIEWER', () => {
      store.setAuthResponse(
        makeUser(),
        [makeUserRole({ role: UserRole.VIEWER })],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.displayRole()).toBe('Viewer');
    });

    it('returns null when no roles', () => {
      store.setAuthResponse(makeUser(), [], { access_token: 'at', refresh_token: 'rt' });
      expect(store.displayRole()).toBeNull();
    });
  });

  describe('getRoleForDepartment', () => {
    beforeEach(() => {
      store.setAuthResponse(
        makeUser(),
        [
          makeUserRole({ role: UserRole.ADMIN, departmentId: 'dept-1' }),
          makeUserRole({ role: UserRole.VIEWER, departmentId: 'dept-2' }),
        ],
        { access_token: 'at', refresh_token: 'rt' },
      );
    });

    it('returns ADMIN for dept-1', () => {
      expect(store.getRoleForDepartment('dept-1')).toBe(UserRole.ADMIN);
    });

    it('returns VIEWER for dept-2', () => {
      expect(store.getRoleForDepartment('dept-2')).toBe(UserRole.VIEWER);
    });

    it('returns null for unknown dept', () => {
      expect(store.getRoleForDepartment('dept-999')).toBeNull();
    });

    it('returns null when user is owner', () => {
      store.setAuthResponse(makeUser({ isOwner: true }), [], { access_token: 'at', refresh_token: 'rt' });
      expect(store.getRoleForDepartment('dept-1')).toBeNull();
    });
  });

  describe('isAdminInDepartment', () => {
    it('returns true when owner (regardless of dept)', () => {
      store.setAuthResponse(makeUser({ isOwner: true }), [], { access_token: 'at', refresh_token: 'rt' });
      expect(store.isAdminInDepartment('dept-1')).toBe(true);
    });

    it('returns true when user is admin in dept', () => {
      store.setAuthResponse(
        makeUser(),
        [makeUserRole({ role: UserRole.ADMIN, departmentId: 'dept-1' })],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.isAdminInDepartment('dept-1')).toBe(true);
    });

    it('returns false when user is viewer in dept', () => {
      store.setAuthResponse(
        makeUser(),
        [makeUserRole({ role: UserRole.VIEWER, departmentId: 'dept-1' })],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.isAdminInDepartment('dept-1')).toBe(false);
    });
  });

  describe('isViewerInDepartment', () => {
    it('returns true when user is viewer in dept', () => {
      store.setAuthResponse(
        makeUser(),
        [makeUserRole({ role: UserRole.VIEWER, departmentId: 'dept-1' })],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.isViewerInDepartment('dept-1')).toBe(true);
    });

    it('returns false when user is admin in dept', () => {
      store.setAuthResponse(
        makeUser(),
        [makeUserRole({ role: UserRole.ADMIN, departmentId: 'dept-1' })],
        { access_token: 'at', refresh_token: 'rt' },
      );
      expect(store.isViewerInDepartment('dept-1')).toBe(false);
    });

    it('returns false when owner (getRoleForDepartment returns null)', () => {
      store.setAuthResponse(makeUser({ isOwner: true }), [], { access_token: 'at', refresh_token: 'rt' });
      expect(store.isViewerInDepartment('dept-1')).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('resets all state to initial values', () => {
      store.setAuthResponse(
        makeUser({ isOwner: true }),
        [makeUserRole()],
        { access_token: 'at', refresh_token: 'rt' },
      );
      store.clearAuth();

      expect(store.user()).toBeNull();
      expect(store.userRoles()).toEqual([]);
      expect(store.accessToken()).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
      expect(store.isOwner()).toBe(false);
    });
  });

  describe('setError / setLoading', () => {
    it('setError updates error signal', () => {
      store.setError('oops');
      expect(store.error()).toBe('oops');
    });

    it('setLoading updates isLoading signal', () => {
      store.setLoading(true);
      expect(store.isLoading()).toBe(true);
    });
  });
});
