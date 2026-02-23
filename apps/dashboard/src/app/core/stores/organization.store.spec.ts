import { TestBed } from '@angular/core/testing';
import { OrganizationStore } from './organization.store';
import { IOrganization } from '@task-management/data';

const mockOrg: IOrganization = {
  id: 'org-1',
  name: 'Acme Corp',
  description: 'Test org',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('OrganizationStore', () => {
  let store: OrganizationStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(OrganizationStore);
  });

  describe('initial state', () => {
    it('organization is null', () => {
      expect(store.organization()).toBeNull();
    });

    it('isLoading is false', () => {
      expect(store.isLoading()).toBe(false);
    });

    it('error is null', () => {
      expect(store.error()).toBeNull();
    });
  });

  describe('setOrganization()', () => {
    it('sets the organization', () => {
      store.setOrganization(mockOrg);
      expect(store.organization()).toEqual(mockOrg);
    });

    it('clears error when organization is set', () => {
      store.setError('previous error');
      store.setOrganization(mockOrg);
      expect(store.error()).toBeNull();
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
      store.setError('Something went wrong');
      expect(store.error()).toBe('Something went wrong');
    });

    it('can clear the error with null', () => {
      store.setError('error');
      store.setError(null);
      expect(store.error()).toBeNull();
    });
  });

  describe('reset()', () => {
    it('resets all state to initial values', () => {
      store.setOrganization(mockOrg);
      store.setLoading(true);
      store.setError('some error');

      store.reset();

      expect(store.organization()).toBeNull();
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });
});
