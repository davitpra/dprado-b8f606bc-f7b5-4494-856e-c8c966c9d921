import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  const restored = await authService.initializeFromStorage();
  if (restored) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
