import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { UserRole } from '@task-management/data';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar" [class.open]="uiStore.isSidebarOpen()">
      <div class="sidebar-brand">
        <h2>TaskManager</h2>
      </div>
      <ul class="nav-links">
        <li>
          <a routerLink="/app/tasks" routerLinkActive="active">
            <span class="nav-icon">📋</span> Tasks
          </a>
        </li>
        @if (authStore.isOwner()) {
          <li>
            <a routerLink="/app/departments" routerLinkActive="active">
              <span class="nav-icon">🏢</span> Departments
            </a>
          </li>
        }
        @if (canViewAuditLog()) {
          <li>
            <a routerLink="/app/audit-log" routerLinkActive="active">
              <span class="nav-icon">📜</span> Audit Log
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: 220px;
      height: 100vh;
      padding: 1rem;
      background: #1f2937;
      color: #f9fafb;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-brand h2 {
      margin: 0 0 2rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: #f9fafb;
    }
    .nav-links {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .nav-links li {
      margin-bottom: 0.25rem;
    }
    .nav-links a {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      border-radius: 0.375rem;
      color: #d1d5db;
      text-decoration: none;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    .nav-links a:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f9fafb;
    }
    .nav-links a.active {
      background: rgba(255, 255, 255, 0.12);
      color: #f9fafb;
      font-weight: 500;
    }
    .nav-icon { font-size: 1rem; }
  `],
})
export class SidebarComponent {
  protected authStore = inject(AuthStore);
  protected uiStore = inject(UIStore);

  protected canViewAuditLog = computed(() => {
    if (this.authStore.isOwner()) return true;
    return this.authStore.userRoles().some((r) => r.role === UserRole.ADMIN);
  });
}
