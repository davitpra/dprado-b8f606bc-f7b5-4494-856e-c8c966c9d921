import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrganizationService } from './organization.service';
import { OrganizationStore } from '../stores/organization.store';
import { createMockOrganizationStore } from '../../testing/mock-stores';
import { IOrganization } from '@task-management/data';

const mockOrg: IOrganization = {
  id: 'org-1',
  name: 'Acme Corp',
  description: 'A test org',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpMock: HttpTestingController;
  let mockOrgStore: ReturnType<typeof createMockOrganizationStore>;

  beforeEach(() => {
    mockOrgStore = createMockOrganizationStore();

    TestBed.configureTestingModule({
      providers: [
        OrganizationService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OrganizationStore, useValue: mockOrgStore },
      ],
    });

    service = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadOrganization()', () => {
    it('GETs /api/organizations/me and calls setOrganization on success', async () => {
      const promise = service.loadOrganization();

      expect(mockOrgStore.setLoading).toHaveBeenCalledWith(true);

      const req = httpMock.expectOne('/api/organizations/me');
      expect(req.request.method).toBe('GET');
      req.flush(mockOrg);

      await promise;

      expect(mockOrgStore.setOrganization).toHaveBeenCalledWith(mockOrg);
      expect(mockOrgStore.setLoading).toHaveBeenCalledWith(false);
    });

    it('calls setError and setLoading(false) on failure', async () => {
      const promise = service.loadOrganization();

      httpMock.expectOne('/api/organizations/me').flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );

      await promise;

      expect(mockOrgStore.setError).toHaveBeenCalledWith('Failed to load organization');
      expect(mockOrgStore.setLoading).toHaveBeenCalledWith(false);
      expect(mockOrgStore.setOrganization).not.toHaveBeenCalled();
    });
  });
});
