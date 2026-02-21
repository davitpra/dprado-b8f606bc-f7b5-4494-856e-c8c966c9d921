import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './shared/layout/shell/shell.component';

export const appRoutes: Route[] = [
  { path: '', redirectTo: '/app/tasks', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'tasks', pathMatch: 'full' },
      {
        path: 'tasks',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.tasksRoutes),
      },
      {
        path: 'departments',
        data: { breadcrumb: 'Departments' },
        loadChildren: () =>
          import('./features/departments/departments.routes').then((m) => m.departmentsRoutes),
      },
      {
        path: 'audit-log',
        loadChildren: () =>
          import('./features/audit-log/audit-log.routes').then((m) => m.auditLogRoutes),
      },
    ],
  },
  { path: '**', redirectTo: '/app/tasks' },
];
