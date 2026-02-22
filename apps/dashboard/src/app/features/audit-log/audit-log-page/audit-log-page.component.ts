import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IAuditLog } from '@task-management/data';

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './audit-log-page.component.html',
})
export class AuditLogPageComponent {
  protected auditLogs = signal<IAuditLog[]>([]);
  protected isLoading = signal(false);
  // HTTP fetch wired when AuditLogService is implemented
}
