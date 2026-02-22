import { computed, Injectable, signal } from '@angular/core';
import { IAuditLog } from '@task-management/data';

export interface AuditLogFilters {
  dateFrom: string;
  dateTo: string;
  action: string;
  resource: string;
}

const DEFAULT_FILTERS: AuditLogFilters = {
  dateFrom: '',
  dateTo: '',
  action: '',
  resource: '',
};

interface AuditLogState {
  logs: IAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: AuditLogFilters;
  isLoading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditLogStore {
  private readonly _state = signal<AuditLogState>({
    logs: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    filters: DEFAULT_FILTERS,
    isLoading: false,
    error: null,
  });

  readonly logs = computed(() => this._state().logs);
  readonly total = computed(() => this._state().total);
  readonly page = computed(() => this._state().page);
  readonly limit = computed(() => this._state().limit);
  readonly totalPages = computed(() => this._state().totalPages);
  readonly filters = computed(() => this._state().filters);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  setLogs(logs: IAuditLog[], total: number, page: number, limit: number, totalPages: number): void {
    this._state.update((s) => ({ ...s, logs, total, page, limit, totalPages, error: null }));
  }

  setFilters(filters: Partial<AuditLogFilters>): void {
    this._state.update((s) => ({ ...s, filters: { ...s.filters, ...filters } }));
  }

  resetFilters(): void {
    this._state.update((s) => ({ ...s, filters: DEFAULT_FILTERS }));
  }

  setLoading(isLoading: boolean): void {
    this._state.update((s) => ({ ...s, isLoading }));
  }

  setError(error: string | null): void {
    this._state.update((s) => ({ ...s, error }));
  }
}
