import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IAuditLog } from '@task-management/data';
import { AuditLogStore } from '../stores/audit-log.store';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private http = inject(HttpClient);
  private auditLogStore = inject(AuditLogStore);

  async loadLogs(page = 1): Promise<void> {
    this.auditLogStore.setLoading(true);
    this.auditLogStore.setError(null);

    try {
      const { dateFrom, dateTo, action, resource } = this.auditLogStore.filters();
      const limit = this.auditLogStore.limit();

      let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
      if (dateFrom) params = params.set('dateFrom', dateFrom);
      if (dateTo) params = params.set('dateTo', dateTo);
      if (action) params = params.set('action', action);
      if (resource) params = params.set('resource', resource);

      const response = await firstValueFrom(
        this.http.get<PaginatedResponse<IAuditLog>>('/api/audit-log', { params }),
      );
      this.auditLogStore.setLogs(
        response.items,
        response.total,
        response.page,
        response.limit,
        response.totalPages,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Object && 'error' in err
          ? ((err as { error: { message?: string } }).error.message ?? 'Failed to load audit log')
          : 'Failed to load audit log';
      this.auditLogStore.setError(message);
    } finally {
      this.auditLogStore.setLoading(false);
    }
  }
}
