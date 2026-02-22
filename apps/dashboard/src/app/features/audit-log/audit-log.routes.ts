import { Route } from '@angular/router';
import { adminOrOwnerGuard } from '../../core/guards/admin-or-owner.guard';
import { AuditLogPageComponent } from './audit-log-page/audit-log-page.component';

export const auditLogRoutes: Route[] = [
  {
    path: '',
    component: AuditLogPageComponent,
    canActivate: [adminOrOwnerGuard],
  },
];
