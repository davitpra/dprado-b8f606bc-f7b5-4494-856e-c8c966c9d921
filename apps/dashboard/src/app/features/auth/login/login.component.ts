import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>TaskManager</h1>
        <h2>Sign In</h2>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="you@example.com"
              autocomplete="email"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="field-error">Valid email is required</span>
            }
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="field-error">Password is required</span>
            }
          </div>
          @if (authStore.error()) {
            <div class="error-banner">{{ authStore.error() }}</div>
          }
          <button type="submit" [disabled]="form.invalid || authStore.isLoading()">
            {{ authStore.isLoading() ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f3f4f6;
    }
    .login-card {
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
      width: 100%;
      max-width: 400px;
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 700; }
    h2 { margin: 0 0 1.5rem; font-size: 1rem; color: #6b7280; font-weight: 400; }
    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    label { margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; }
    input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 1rem;
      outline: none;
    }
    input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
    .field-error { color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; }
    .error-banner {
      background: #fee2e2;
      color: #991b1b;
      padding: 0.75rem;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    button[type="submit"] {
      width: 100%;
      padding: 0.625rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 1rem;
      cursor: pointer;
      font-weight: 500;
    }
    button[type="submit"]:hover:not(:disabled) { background: #2563eb; }
    button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class LoginComponent {
  protected authStore = inject(AuthStore);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    // TODO: replace with real AuthService call
    const email = this.form.value.email ?? '';
    this.authStore.setAuthResponse(
      {
        id: 'dev-user-1',
        email,
        firstName: 'Dev',
        lastName: 'User',
        organizationId: 'org-1',
        isOwner: true,
        createdAt: new Date().toISOString(),
      },
      [],
      { access_token: 'dev-token', refresh_token: 'dev-refresh' },
    );
    this.router.navigate(['/app/tasks']);
  }
}
