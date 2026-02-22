import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentService } from '../../../core/services/department.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { TaskService } from '../../../core/services/task.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected uiStore = inject(UIStore);
  private authStore = inject(AuthStore);
  private departmentStore = inject(DepartmentStore);
  private departmentService = inject(DepartmentService);
  private organizationService = inject(OrganizationService);
  private taskService = inject(TaskService);

  private depsLoaded = false;

  constructor() {
    effect(() => {
      const isDark = this.uiStore.isDarkMode();
      document.documentElement.classList.toggle('dark', isDark);
    });

    effect(() => {
      const isAuth = this.authStore.isAuthenticated();
      const deptId = this.departmentStore.currentDepartmentId();
      if (!isAuth) return;

      untracked(() => {
        if (!this.depsLoaded) {
          this.depsLoaded = true;
          this.organizationService.loadOrganization();
          this.departmentService.loadDepartments().then(() => {
            // Auto-select first department for non-owners
            if (!this.authStore.isOwner() && !this.departmentStore.currentDepartmentId()) {
              const roles = this.authStore.userRoles();
              const firstRole = roles.find(r => r.departmentId);
              if (firstRole?.departmentId) {
                this.departmentStore.setCurrentDepartment(firstRole.departmentId);
                return; // setCurrentDepartment will re-trigger this effect
              }
            }
          });
        }
        this.taskService.loadTasks(deptId);
      });
    });
  }
}
