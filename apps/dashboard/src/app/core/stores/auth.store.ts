import { computed, Injectable, signal } from '@angular/core';
import { IAuthResponse, IUser, IUserRole, UserRole } from '@task-management/data';

interface AuthState {
  user: IUser | null;
  userRoles: IUserRole[];
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  userRoles: [],
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _state = signal<AuthState>(initialState);

  // Selectors
  readonly user = computed(() => this._state().user);
  readonly userRoles = computed(() => this._state().userRoles);
  readonly accessToken = computed(() => this._state().accessToken);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  readonly isAuthenticated = computed(() => !!this._state().accessToken);
  readonly isOwner = computed(() => this._state().user?.isOwner ?? false);

  readonly currentUserName = computed(() => {
    const user = this._state().user;
    return user ? `${user.firstName} ${user.lastName}` : null;
  });

  // Actions
  setAuthResponse(user: IUser, roles: IUserRole[], tokens: IAuthResponse): void {
    this._state.update((s) => ({
      ...s,
      user,
      userRoles: roles,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      error: null,
    }));
  }

  setTokens(tokens: IAuthResponse): void {
    this._state.update((s) => ({
      ...s,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    }));
  }

  setLoading(isLoading: boolean): void {
    this._state.update((s) => ({ ...s, isLoading }));
  }

  setError(error: string | null): void {
    this._state.update((s) => ({ ...s, error }));
  }

  clearAuth(): void {
    this._state.set(initialState);
  }

  // Helpers
  getRoleForDepartment(departmentId: string): UserRole.ADMIN | UserRole.VIEWER | null {
    if (this.isOwner()) return null; // owner bypasses role checks
    const role = this._state().userRoles.find((r) => r.departmentId === departmentId);
    return role?.role ?? null;
  }

  isAdminInDepartment(departmentId: string): boolean {
    if (this.isOwner()) return true;
    return this.getRoleForDepartment(departmentId) === UserRole.ADMIN;
  }

  isViewerInDepartment(departmentId: string): boolean {
    return this.getRoleForDepartment(departmentId) === UserRole.VIEWER;
  }

  hasAccessToDepartment(departmentId: string): boolean {
    if (this.isOwner()) return true;
    return !!this.getRoleForDepartment(departmentId);
  }
}
