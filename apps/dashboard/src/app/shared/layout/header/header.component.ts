import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  template: `
    <header class="app-header">
      <div class="header-left">
        <select
          [value]="departmentStore.currentDepartmentId() ?? ''"
          (change)="onDepartmentChange($event)"
          aria-label="Select department"
        >
          <option value="">All Departments</option>
          @for (dept of departmentStore.departments(); track dept.id) {
            <option [value]="dept.id">{{ dept.name }}</option>
          }
        </select>
      </div>
      <div class="header-right">
        <span class="username">{{ authStore.currentUserName() }}</span>
        <button (click)="toggleTheme()" aria-label="Toggle theme" class="icon-btn">
          {{ uiStore.isDarkMode() ? '☀️' : '🌙' }}
        </button>
        <button (click)="logout()" class="logout-btn">Logout</button>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
      flex-shrink: 0;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .username {
      font-size: 0.875rem;
      color: #374151;
    }
    select {
      padding: 0.375rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.125rem;
      padding: 0.25rem;
    }
    .logout-btn {
      padding: 0.375rem 0.75rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .logout-btn:hover { background: #e5e7eb; }
  `],
})
export class HeaderComponent {
  protected authStore = inject(AuthStore);
  protected uiStore = inject(UIStore);
  protected departmentStore = inject(DepartmentStore);
  private router = inject(Router);

  toggleTheme(): void {
    this.uiStore.toggleTheme();
  }

  logout(): void {
    this.authStore.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  onDepartmentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.departmentStore.setCurrentDepartment(value || null);
  }
}
