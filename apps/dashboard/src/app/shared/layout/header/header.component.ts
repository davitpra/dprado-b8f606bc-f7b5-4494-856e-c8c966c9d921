import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideMenu,
  lucideSun,
  lucideMoon,
  lucideLogOut,
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { OrganizationStore } from '../../../core/stores/organization.store';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [NgIcon],
  providers: [provideIcons({ lucideMenu, lucideSun, lucideMoon, lucideLogOut })],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected authStore = inject(AuthStore);
  protected uiStore = inject(UIStore);
  protected departmentStore = inject(DepartmentStore);
  protected orgStore = inject(OrganizationStore);
  private authService = inject(AuthService);

  toggleTheme(): void {
    this.uiStore.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
  }

  onDepartmentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.departmentStore.setCurrentDepartment(value || null);
  }

  roleBadgeClasses(role: string): string {
    switch (role) {
      case 'Owner':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Admin':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  }
}
