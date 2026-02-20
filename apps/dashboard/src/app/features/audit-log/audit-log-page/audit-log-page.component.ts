import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IAuditLog } from '@task-management/data';

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="audit-log-page">
      <div class="page-header">
        <h1>Audit Log</h1>
      </div>

      @if (isLoading()) {
        <div class="state-msg">Loading audit log…</div>
      } @else if (auditLogs().length === 0) {
        <div class="state-msg">No audit log entries found.</div>
      } @else {
        <div class="table-wrapper">
          <table class="log-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              @for (log of auditLogs(); track log.id) {
                <tr>
                  <td class="mono">{{ log.timestamp | date:'medium' }}</td>
                  <td>{{ log.userId }}</td>
                  <td><span class="action-badge">{{ log.action }}</span></td>
                  <td>{{ log.resource }}/{{ log.resourceId }}</td>
                  <td class="mono">{{ log.ipAddress }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .audit-log-page { }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .state-msg { text-align: center; padding: 3rem; color: #6b7280; background: white; border-radius: 0.5rem; }
    .table-wrapper { background: white; border-radius: 0.5rem; overflow-x: auto; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .log-table { width: 100%; border-collapse: collapse; }
    .log-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      background: #f9fafb;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }
    .log-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
    .log-table tr:last-child td { border-bottom: none; }
    .action-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: #e0e7ff;
      color: #3730a3;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .mono { font-family: monospace; font-size: 0.8rem; }
  `],
})
export class AuditLogPageComponent {
  protected auditLogs = signal<IAuditLog[]>([]);
  protected isLoading = signal(false);
  // HTTP fetch wired when AuditLogService is implemented
}
