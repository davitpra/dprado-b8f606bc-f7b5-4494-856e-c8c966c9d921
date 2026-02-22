import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard,
  lucideBuilding2,
  lucideScrollText,
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { UserRole } from '@task-management/data';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  providers: [
    provideIcons({ lucideLayoutDashboard, lucideBuilding2, lucideScrollText }),
  ],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected authStore = inject(AuthStore);
  protected uiStore = inject(UIStore);
  private departmentStore = inject(DepartmentStore);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected canViewAuditLog = computed(() => {
    if (this.authStore.isOwner()) return true;
    const currentDeptId = this.departmentStore.currentDepartmentId();
    return this.authStore.userRoles().some(
      (r) => r.role === UserRole.ADMIN && r.departmentId === currentDeptId,
    );
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (window.innerWidth < 1024) {
          this.uiStore.closeSidebar();
        }
      });
  }
}
