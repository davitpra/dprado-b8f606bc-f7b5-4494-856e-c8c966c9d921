import { Route } from '@angular/router';
import { ownerGuard } from '../../core/guards/owner.guard';
import { DepartmentsPageComponent } from './departments-page/departments-page.component';
import { MembersPageComponent } from './members-page/members-page.component';

export const departmentsRoutes: Route[] = [
  { path: '', component: DepartmentsPageComponent, canActivate: [ownerGuard] },
  { path: ':id/members', component: MembersPageComponent },
];
