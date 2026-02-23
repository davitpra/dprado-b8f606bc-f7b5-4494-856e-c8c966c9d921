import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditLogService } from './audit-log.service';
import { AuditLogStore } from '../stores/audit-log.store';
import { createMockAuditLogStore } from '../../testing/mock-stores';
import { makeAuditLog } from '../../testing/test-fixtures';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;
  let mockAuditLogStore: ReturnType<typeof createMockAuditLogStore>;

  beforeEach(() => {
    mockAuditLogStore = createMockAuditLogStore();

    TestBed.configureTestingModule({
      providers: [
        AuditLogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuditLogStore, useValue: mockAuditLogStore },
      ],
    });

    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadLogs()', () => {
    it('GETs /api/audit-log with page and limit params on success', async () => {
      const items = [makeAuditLog({ id: 'log-1' })];
      const promise = service.loadLogs(1);

      expect(mockAuditLogStore.setLoading).toHaveBeenCalledWith(true);

      const req = httpMock.expectOne(
        (r) => r.url === '/api/audit-log' && r.params.get('page') === '1' && r.params.get('limit') === '20',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items, total: 1, page: 1, limit: 20, totalPages: 1 });

      await promise;

      expect(mockAuditLogStore.setLogs).toHaveBeenCalledWith(items, 1, 1, 20, 1);
      expect(mockAuditLogStore.setLoading).toHaveBeenCalledWith(false);
    });

    it('includes departmentId param when provided', async () => {
      const promise = service.loadLogs(1, 'dept-1');

      const req = httpMock.expectOne(
        (r) => r.url === '/api/audit-log' && r.params.get('departmentId') === 'dept-1',
      );
      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await promise;
      expect(req).toBeTruthy();
    });

    it('includes active filter params when non-empty', async () => {
      mockAuditLogStore.filters.mockReturnValue({
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        action: 'create',
        resource: 'task',
      });

      const promise = service.loadLogs(1);

      const req = httpMock.expectOne((r) => {
        return (
          r.url === '/api/audit-log' &&
          r.params.get('dateFrom') === '2026-01-01' &&
          r.params.get('dateTo') === '2026-12-31' &&
          r.params.get('action') === 'create' &&
          r.params.get('resource') === 'task'
        );
      });
      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await promise;
      expect(req).toBeTruthy();
    });

    it('omits empty string filter params', async () => {
      mockAuditLogStore.filters.mockReturnValue({
        dateFrom: '',
        dateTo: '',
        action: '',
        resource: '',
      });

      const promise = service.loadLogs(1);

      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');
      expect(req.request.params.has('dateFrom')).toBe(false);
      expect(req.request.params.has('action')).toBe(false);
      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await promise;
    });

    it('calls setError with "Failed to load audit log" on generic error', async () => {
      const promise = service.loadLogs(1);

      httpMock.expectOne((r) => r.url === '/api/audit-log').flush(
        'Internal Server Error',
        { status: 500, statusText: 'Internal Server Error' },
      );

      await promise;

      expect(mockAuditLogStore.setError).toHaveBeenCalledWith(expect.stringContaining('Failed to load audit log'));
      expect(mockAuditLogStore.setLoading).toHaveBeenCalledWith(false);
    });

    it('extracts error.message from nested HTTP error body', async () => {
      const promise = service.loadLogs(1);

      httpMock.expectOne((r) => r.url === '/api/audit-log').flush(
        { message: 'Custom backend error' },
        { status: 403, statusText: 'Forbidden' },
      );

      await promise;

      expect(mockAuditLogStore.setError).toHaveBeenCalledWith('Custom backend error');
    });
  });
});
