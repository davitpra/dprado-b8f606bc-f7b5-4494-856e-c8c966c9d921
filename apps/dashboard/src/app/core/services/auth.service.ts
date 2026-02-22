import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IAuthCredentials,
  IAuthMeResponse,
  IAuthResponse,
} from '@task-management/data';
import { AuthStore } from '../stores/auth.store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authStore = inject(AuthStore);
  private initPromise: Promise<boolean> | null = null;

  async login(email: string, password: string): Promise<void> {
    this.authStore.setLoading(true);
    this.authStore.setError(null);

    try {
      const tokens = await firstValueFrom(
        this.http.post<IAuthResponse>('/api/auth/login', {
          email,
          password,
        } as IAuthCredentials),
      );

      this.saveTokens(tokens);

      const me = await this.getCurrentUser();
      this.authStore.setAuthResponse(me.user, me.roles, tokens);
    } catch (err: unknown) {
      const message =
        err instanceof Object && 'error' in err
          ? ((err as { error: { message?: string } }).error.message ??
            'Login failed')
          : 'Login failed';
      this.authStore.setError(message);
      throw err;
    } finally {
      this.authStore.setLoading(false);
    }
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName: string;
  }): Promise<void> {
    this.authStore.setLoading(true);
    this.authStore.setError(null);
    try {
      const tokens = await firstValueFrom(
        this.http.post<IAuthResponse>('/api/auth/register', data),
      );
      this.saveTokens(tokens);
      const me = await this.getCurrentUser();
      this.authStore.setAuthResponse(me.user, me.roles, tokens);
    } catch (err: unknown) {
      const message =
        err instanceof Object && 'error' in err
          ? ((err as { error: { message?: string } }).error.message ?? 'Registration failed')
          : 'Registration failed';
      this.authStore.setError(message);
      throw err;
    } finally {
      this.authStore.setLoading(false);
    }
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.authStore.clearAuth();
    this.initPromise = null;
    this.router.navigate(['/auth/login']);
  }

  async refreshToken(): Promise<IAuthResponse> {
    const refresh_token = localStorage.getItem(REFRESH_TOKEN_KEY);
    const tokens = await firstValueFrom(
      this.http.post<IAuthResponse>('/api/auth/refresh', { refresh_token }),
    );
    this.saveTokens(tokens);
    this.authStore.setTokens(tokens);
    return tokens;
  }

  async getCurrentUser(): Promise<IAuthMeResponse> {
    return firstValueFrom(
      this.http.get<IAuthMeResponse>('/api/auth/me'),
    );
  }

  initializeFromStorage(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expMs = payload.exp * 1000;
      return Date.now() >= expMs - 5000;
    } catch {
      return true;
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private async doInitialize(): Promise<boolean> {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!accessToken && !refreshTokenValue) return false;

    try {
      if (!accessToken || this.isTokenExpired(accessToken)) {
        if (!refreshTokenValue) return false;
        await this.refreshToken();
      }

      const me = await this.getCurrentUser();
      const tokens: IAuthResponse = {
        access_token: localStorage.getItem(ACCESS_TOKEN_KEY)!,
        refresh_token: localStorage.getItem(REFRESH_TOKEN_KEY)!,
      };
      this.authStore.setAuthResponse(me.user, me.roles, tokens);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  private saveTokens(tokens: IAuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
}
