import { TestBed } from '@angular/core/testing';
import { AuditLogStore } from './audit-log.store';
import { makeAuditLog } from '../../testing/test-fixtures';

const DEFAULT_FILTERS = { dateFrom: '', dateTo: '', action: '', resource: '' };

describe('AuditLogStore', () => {
  let store: AuditLogStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuditLogStore);
  });

  describe('initial state', () => {
    it('logs is empty', () => {
      expect(store.logs()).toEqual([]);
    });

    it('page is 1', () => {
      expect(store.page()).toBe(1);
    });

    it('limit is 20', () => {
      expect(store.limit()).toBe(20);
    });

    it('total is 0', () => {
      expect(store.total()).toBe(0);
    });

    it('totalPages is 0', () => {
      expect(store.totalPages()).toBe(0);
    });

    it('filters match DEFAULT_FILTERS', () => {
      expect(store.filters()).toEqual(DEFAULT_FILTERS);
    });

    it('isLoading is false', () => {
      expect(store.isLoading()).toBe(false);
    });

    it('error is null', () => {
      expect(store.error()).toBeNull();
    });
  });

  describe('setLogs()', () => {
    it('updates all pagination fields', () => {
      const logs = [makeAuditLog({ id: 'log-1' }), makeAuditLog({ id: 'log-2' })];
      store.setLogs(logs, 45, 2, 20, 3);

      expect(store.logs()).toHaveLength(2);
      expect(store.total()).toBe(45);
      expect(store.page()).toBe(2);
      expect(store.limit()).toBe(20);
      expect(store.totalPages()).toBe(3);
    });

    it('clears error when logs are set', () => {
      store.setError('previous error');
      store.setLogs([], 0, 1, 20, 0);
      expect(store.error()).toBeNull();
    });
  });

  describe('setFilters()', () => {
    it('merges partial filters — other fields unchanged', () => {
      store.setFilters({ action: 'create' });
      expect(store.filters().action).toBe('create');
      expect(store.filters().resource).toBe('');
      expect(store.filters().dateFrom).toBe('');
      expect(store.filters().dateTo).toBe('');
    });

    it('merges multiple fields at once', () => {
      store.setFilters({ action: 'delete', resource: 'task' });
      expect(store.filters().action).toBe('delete');
      expect(store.filters().resource).toBe('task');
    });
  });

  describe('resetFilters()', () => {
    it('resets filters back to DEFAULT_FILTERS', () => {
      store.setFilters({ action: 'create', resource: 'task', dateFrom: '2026-01-01', dateTo: '2026-12-31' });
      store.resetFilters();
      expect(store.filters()).toEqual(DEFAULT_FILTERS);
    });
  });

  describe('setLoading()', () => {
    it('sets isLoading to true', () => {
      store.setLoading(true);
      expect(store.isLoading()).toBe(true);
    });

    it('sets isLoading to false', () => {
      store.setLoading(true);
      store.setLoading(false);
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('setError()', () => {
    it('sets the error message', () => {
      store.setError('Failed to load audit log');
      expect(store.error()).toBe('Failed to load audit log');
    });

    it('can clear the error with null', () => {
      store.setError('error');
      store.setError(null);
      expect(store.error()).toBeNull();
    });
  });
});
