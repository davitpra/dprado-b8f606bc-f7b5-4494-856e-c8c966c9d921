import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return router.createUrlTree(['/app/tasks']);
  }

  const restored = await authService.initializeFromStorage();
  if (restored) {
    return router.createUrlTree(['/app/tasks']);
  }

  return true;
};
