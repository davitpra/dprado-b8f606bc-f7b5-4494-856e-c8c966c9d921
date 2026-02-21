import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const departmentAdminGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const departmentId = route.paramMap.get('id');
  if (!departmentId) {
    return router.createUrlTree(['/app/tasks']);
  }

  if (authStore.isAdminInDepartment(departmentId)) {
    return true;
  }

  return router.createUrlTree(['/app/tasks']);
};
