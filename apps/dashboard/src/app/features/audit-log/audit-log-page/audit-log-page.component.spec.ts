import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuditLogPageComponent } from './audit-log-page.component';
import { AuditLogStore } from '../../../core/stores/audit-log.store';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { DepartmentStore } from '../../../core/stores/department.store';
import {
  createMockAuditLogStore,
  createMockDepartmentStore,
} from '../../../testing/mock-stores';
import { makeAuditLog, makeDepartment } from '../../../testing/test-fixtures';

describe('AuditLogPageComponent', () => {
  let fixture: ComponentFixture<AuditLogPageComponent>;
  let component: AuditLogPageComponent;
  let mockAuditLogStore: ReturnType<typeof createMockAuditLogStore>;
  let mockAuditLogService: { loadLogs: jest.Mock };
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;

  beforeEach(async () => {
    mockAuditLogStore = createMockAuditLogStore();
    mockAuditLogService = { loadLogs: jest.fn().mockResolvedValue(undefined) };
    mockDeptStore = createMockDepartmentStore();

    await TestBed.configureTestingModule({
      imports: [AuditLogPageComponent],
      providers: [
        { provide: AuditLogStore, useValue: mockAuditLogStore },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: DepartmentStore, useValue: mockDeptStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AuditLogPageComponent, { set: { imports: [] } })
      .compileComponents();
  });

  const createFixture = () => {
    fixture = TestBed.createComponent(AuditLogPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('init effect', () => {
    it('calls auditLogService.loadLogs(1, null) on init when currentDepartmentId is null', () => {
      mockDeptStore.currentDepartmentId.mockReturnValue(null);
      createFixture();
      expect(mockAuditLogService.loadLogs).toHaveBeenCalledWith(1, null);
    });

    it('calls auditLogService.loadLogs(1, deptId) on init when currentDepartmentId is set', () => {
      mockDeptStore.currentDepartmentId.mockReturnValue('dept-1');
      createFixture();
      expect(mockAuditLogService.loadLogs).toHaveBeenCalledWith(1, 'dept-1');
    });
  });

  describe('getActionBadgeClass()', () => {
    beforeEach(() => createFixture());

    it('"create" → includes bg-green-100', () => {
      expect(component['getActionBadgeClass']('create')).toContain('bg-green-100');
    });

    it('"CREATE" (uppercase) → same green class (case-insensitive)', () => {
      expect(component['getActionBadgeClass']('CREATE')).toContain('bg-green-100');
    });

    it('"update" → includes bg-blue-100', () => {
      expect(component['getActionBadgeClass']('update')).toContain('bg-blue-100');
    });

    it('"delete" → includes bg-red-100', () => {
      expect(component['getActionBadgeClass']('delete')).toContain('bg-red-100');
    });

    it('"read" → includes bg-gray-100 (default)', () => {
      expect(component['getActionBadgeClass']('read')).toContain('bg-gray-100');
    });
  });

  describe('getUserDisplay()', () => {
    beforeEach(() => createFixture());

    it('returns "First Last" when log has a user object', () => {
      const log = makeAuditLog({
        userId: 'user-1',
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      });
      expect(component['getUserDisplay'](log)).toBe('John Doe');
    });

    it('returns userId when log has no user object', () => {
      const log = makeAuditLog({ userId: 'user-42', user: undefined });
      expect(component['getUserDisplay'](log)).toBe('user-42');
    });
  });

  describe('formatDetails()', () => {
    beforeEach(() => createFixture());

    it('returns "—" for empty details object', () => {
      expect(component['formatDetails']({})).toBe('—');
    });

    it('returns "denied: <action>" when originalAction present', () => {
      expect(component['formatDetails']({ originalAction: 'update' })).toBe('denied: update');
    });

    it('returns "key: value · key: value" for body fields', () => {
      const result = component['formatDetails']({ body: { title: 'Task A', status: 'DONE' } });
      expect(result).toBe('title: Task A · status: DONE');
    });

    it('resolves departmentId to dept name when dept is in store', () => {
      mockDeptStore.departments.mockReturnValue([
        makeDepartment({ id: 'dept-1', name: 'Engineering' }),
      ]);
      // Re-create so deptNameMap picks up the mock departments
      createFixture();
      expect(component['formatDetails']({ departmentId: 'dept-1' })).toBe('dept: Engineering');
    });

    it('falls back to first 8 chars of id when dept not in store', () => {
      mockDeptStore.departments.mockReturnValue([]);
      createFixture();
      const unknownId = 'unknown-id-1234567';
      const result = component['formatDetails']({ departmentId: unknownId });
      expect(result).toBe(`dept: ${unknownId.slice(0, 8)}`);
    });

    it('returns "—" when details has no matching key', () => {
      expect(component['formatDetails']({ someOtherKey: 'value' })).toBe('—');
    });
  });

  describe('rangeStart / rangeEnd', () => {
    beforeEach(() => createFixture());

    it('page=1, limit=20 → rangeStart=1', () => {
      mockAuditLogStore.page.mockReturnValue(1);
      mockAuditLogStore.limit.mockReturnValue(20);
      expect(component['rangeStart']).toBe(1);
    });

    it('page=1, limit=20, total=45 → rangeEnd=20', () => {
      mockAuditLogStore.page.mockReturnValue(1);
      mockAuditLogStore.limit.mockReturnValue(20);
      mockAuditLogStore.total.mockReturnValue(45);
      expect(component['rangeEnd']).toBe(20);
    });

    it('page=2, limit=20 → rangeStart=21', () => {
      mockAuditLogStore.page.mockReturnValue(2);
      mockAuditLogStore.limit.mockReturnValue(20);
      expect(component['rangeStart']).toBe(21);
    });

    it('page=2, limit=20, total=45 → rangeEnd=40', () => {
      mockAuditLogStore.page.mockReturnValue(2);
      mockAuditLogStore.limit.mockReturnValue(20);
      mockAuditLogStore.total.mockReturnValue(45);
      expect(component['rangeEnd']).toBe(40);
    });

    it('page=3, limit=20, total=45 → rangeEnd=45 (Math.min)', () => {
      mockAuditLogStore.page.mockReturnValue(3);
      mockAuditLogStore.limit.mockReturnValue(20);
      mockAuditLogStore.total.mockReturnValue(45);
      expect(component['rangeEnd']).toBe(45);
    });
  });

  describe('onFilterChange()', () => {
    it('calls auditLogStore.setFilters and then loadLogs(1, currentDeptId)', async () => {
      mockDeptStore.currentDepartmentId.mockReturnValue('dept-2');
      createFixture();

      await component['onFilterChange']({ action: 'delete' });

      expect(mockAuditLogStore.setFilters).toHaveBeenCalledWith({ action: 'delete' });
      expect(mockAuditLogService.loadLogs).toHaveBeenCalledWith(1, 'dept-2');
    });
  });

  describe('onClearFilters()', () => {
    it('calls auditLogStore.resetFilters and then loadLogs(1, currentDeptId)', async () => {
      mockDeptStore.currentDepartmentId.mockReturnValue('dept-3');
      createFixture();

      await component['onClearFilters']();

      expect(mockAuditLogStore.resetFilters).toHaveBeenCalled();
      expect(mockAuditLogService.loadLogs).toHaveBeenCalledWith(1, 'dept-3');
    });
  });

  describe('onPageChange()', () => {
    it('calls loadLogs with newPage and currentDeptId', async () => {
      mockDeptStore.currentDepartmentId.mockReturnValue('dept-4');
      createFixture();

      await component['onPageChange'](3);

      expect(mockAuditLogService.loadLogs).toHaveBeenCalledWith(3, 'dept-4');
    });
  });
});
