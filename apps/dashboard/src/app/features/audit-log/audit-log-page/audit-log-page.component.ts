import { Component, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideX } from '@ng-icons/lucide';
import { IAuditLog } from '@task-management/data';
import { AuditLogStore } from '../../../core/stores/audit-log.store';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { DepartmentStore } from '../../../core/stores/department.store';

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [DatePipe, NgIcon],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideX })],
  templateUrl: './audit-log-page.component.html',
})
export class AuditLogPageComponent {
  protected auditLogStore = inject(AuditLogStore);
  private auditLogService = inject(AuditLogService);
  private departmentStore = inject(DepartmentStore);

  constructor() {
    effect(() => {
      const deptId = this.departmentStore.currentDepartmentId();
      this.auditLogService.loadLogs(1, deptId);
    });
  }

  protected async onFilterChange(partial: Partial<{ dateFrom: string; dateTo: string; action: string; resource: string }>): Promise<void> {
    this.auditLogStore.setFilters(partial);
    await this.auditLogService.loadLogs(1, this.departmentStore.currentDepartmentId());
  }

  protected async onClearFilters(): Promise<void> {
    this.auditLogStore.resetFilters();
    await this.auditLogService.loadLogs(1, this.departmentStore.currentDepartmentId());
  }

  protected async onPageChange(newPage: number): Promise<void> {
    await this.auditLogService.loadLogs(newPage, this.departmentStore.currentDepartmentId());
  }

  protected getActionBadgeClass(action: string): string {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  protected getUserDisplay(log: IAuditLog): string {
    if (log.user) {
      return `${log.user.firstName} ${log.user.lastName}`;
    }
    return log.userId;
  }

  protected formatDetails(details: Record<string, unknown>): string {
    if (!details || Object.keys(details).length === 0) return '—';

    // Access denied: show the original action
    if (details['originalAction']) {
      return `denied: ${details['originalAction']}`;
    }

    // Show body fields as readable key: value pairs
    const body = details['body'] as Record<string, unknown> | undefined;
    if (body && Object.keys(body).length > 0) {
      return Object.entries(body)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
    }

    // Fallback: departmentId only
    if (details['departmentId']) {
      return `dept: ${details['departmentId']}`;
    }

    return '—';
  }

  protected get rangeStart(): number {
    const page = this.auditLogStore.page();
    const limit = this.auditLogStore.limit();
    return (page - 1) * limit + 1;
  }

  protected get rangeEnd(): number {
    const page = this.auditLogStore.page();
    const limit = this.auditLogStore.limit();
    const total = this.auditLogStore.total();
    return Math.min(page * limit, total);
  }
}
