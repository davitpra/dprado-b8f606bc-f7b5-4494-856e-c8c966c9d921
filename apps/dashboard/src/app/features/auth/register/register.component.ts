import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, RouterLink],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  protected authStore = inject(AuthStore);
  private router = inject(Router);
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);

  protected showPassword = signal(false);

  protected form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(64)]],
    lastName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(64)]],
    organizationName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(128)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
      ],
    ],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    const { firstName, lastName, organizationName, email, password } = this.form.getRawValue();
    try {
      await this.authService.register({ firstName, lastName, organizationName, email, password });
      this.router.navigate(['/app/tasks']);
    } catch {
      // error already set in store by AuthService
    }
  }
}
