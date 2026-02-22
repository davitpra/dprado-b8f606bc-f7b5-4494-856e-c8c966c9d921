import { Route } from '@angular/router';
import { noAuthGuard } from '../../core/guards/no-auth.guard';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';

export const authRoutes: Route[] = [
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [noAuthGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
