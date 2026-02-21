import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  protected authStore = inject(AuthStore);
  private router = inject(Router);
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);

  protected showPassword = signal(false);

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    try {
      await this.authService.login(email, password);
      this.router.navigate(['/app/tasks']);
    } catch {
      // error already set in store by AuthService
    }
  }
}
