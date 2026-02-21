import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IAuditLog } from '@task-management/data';

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div>
      <div class="mb-6">
        <h1 class="m-0 text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1>
      </div>

      @if (isLoading()) {
        <div class="text-center p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">Loading audit log…</div>
      } @else if (auditLogs().length === 0) {
        <div class="text-center p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">No audit log entries found.</div>
      } @else {
        <div class="bg-white dark:bg-gray-800 rounded-lg overflow-x-auto shadow-sm">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Timestamp</th>
                <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">User</th>
                <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Action</th>
                <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Resource</th>
                <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">IP Address</th>
              </tr>
            </thead>
            <tbody>
              @for (log of auditLogs(); track log.id) {
                <tr>
                  <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-mono text-[0.8rem] text-gray-700 dark:text-gray-300">{{ log.timestamp | date:'medium' }}</td>
                  <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100">{{ log.userId }}</td>
                  <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm">
                    <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 text-[0.7rem] font-semibold uppercase">{{ log.action }}</span>
                  </td>
                  <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">{{ log.resource }}/{{ log.resourceId }}</td>
                  <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-mono text-[0.8rem] text-gray-500 dark:text-gray-400">{{ log.ipAddress }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AuditLogPageComponent {
  protected auditLogs = signal<IAuditLog[]>([]);
  protected isLoading = signal(false);
  // HTTP fetch wired when AuditLogService is implemented
}
