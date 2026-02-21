import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { UserRole } from '@task-management/data';

export const adminOrOwnerGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isOwner()) {
    return true;
  }

  if (authStore.userRoles().some((r) => r.role === UserRole.ADMIN)) {
    return true;
  }

  return router.createUrlTree(['/app/tasks']);
};
