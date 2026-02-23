import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentService } from './department.service';
import { DepartmentStore } from '../stores/department.store';
import { ToastService } from './toast.service';
import { makeUser, makeDepartment } from '../../testing/test-fixtures';
import { UserRole } from '@task-management/data';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let httpMock: HttpTestingController;
  let mockDeptStore: jest.Mocked<
    Pick<
      DepartmentStore,
      | 'setLoading'
      | 'setError'
      | 'setDepartments'
      | 'addDepartment'
      | 'updateDepartment'
      | 'removeDepartment'
      | 'setMembers'
      | 'addMember'
      | 'updateMember'
      | 'removeMember'
      | 'setOrgUsers'
    >
  >;
  let mockToastService: { success: jest.Mock; error: jest.Mock };

  const memberResponse = {
    id: 'role-1',
    userId: 'user-1',
    role: UserRole.ADMIN,
    departmentId: 'dept-1',
    user: makeUser(),
  };

  beforeEach(() => {
    mockDeptStore = {
      setLoading: jest.fn(),
      setError: jest.fn(),
      setDepartments: jest.fn(),
      addDepartment: jest.fn(),
      updateDepartment: jest.fn(),
      removeDepartment: jest.fn(),
      setMembers: jest.fn(),
      addMember: jest.fn(),
      updateMember: jest.fn(),
      removeMember: jest.fn(),
      setOrgUsers: jest.fn(),
    };
    mockToastService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        DepartmentService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: ToastService, useValue: mockToastService },
      ],
    });

    service = TestBed.inject(DepartmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadDepartments()', () => {
    it('GETs /api/departments and calls setDepartments', async () => {
      const depts = [makeDepartment()];
      const p = service.loadDepartments();
      httpMock.expectOne('/api/departments').flush(depts);
      await p;
      expect(mockDeptStore.setDepartments).toHaveBeenCalledWith(depts);
    });

    it('calls setError on failure', async () => {
      const p = service.loadDepartments();
      httpMock.expectOne('/api/departments').flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' },
      );
      await p;
      expect(mockDeptStore.setError).toHaveBeenCalled();
    });
  });

  describe('createDepartment()', () => {
    it('POSTs to /api/departments and calls addDepartment', async () => {
      const dept = makeDepartment();
      const p = service.createDepartment({ name: 'Engineering' });
      httpMock.expectOne('/api/departments').flush(dept);
      await p;
      expect(mockDeptStore.addDepartment).toHaveBeenCalledWith(dept);
      expect(mockToastService.success).toHaveBeenCalledWith('Department created');
    });

    it('calls setError and toastService.error on failure', async () => {
      const p = service.createDepartment({ name: 'X' });
      httpMock.expectOne('/api/departments').flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(p).rejects.toBeTruthy();
      expect(mockDeptStore.setError).toHaveBeenCalled();
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('updateDepartment()', () => {
    it('PUTs to /api/departments/:id and calls updateDepartment', async () => {
      const dept = makeDepartment({ name: 'Updated' });
      const p = service.updateDepartment('dept-1', { name: 'Updated' });
      httpMock.expectOne('/api/departments/dept-1').flush(dept);
      await p;
      expect(mockDeptStore.updateDepartment).toHaveBeenCalledWith(dept);
      expect(mockToastService.success).toHaveBeenCalledWith('Department updated');
    });
  });

  describe('deleteDepartment()', () => {
    it('DELETEs /api/departments/:id and calls removeDepartment', async () => {
      const p = service.deleteDepartment('dept-1');
      httpMock.expectOne('/api/departments/dept-1').flush(null);
      await p;
      expect(mockDeptStore.removeDepartment).toHaveBeenCalledWith('dept-1');
      expect(mockToastService.success).toHaveBeenCalledWith('Department deleted');
    });
  });

  describe('inviteMember()', () => {
    it('POSTs to /api/departments/:id/members and calls addMember', async () => {
      const p = service.inviteMember('dept-1', { userId: 'user-1', role: 'admin' });
      httpMock.expectOne('/api/departments/dept-1/members').flush(memberResponse);
      await p;
      expect(mockDeptStore.addMember).toHaveBeenCalledWith({
        user: memberResponse.user,
        role: 'admin',
      });
      expect(mockToastService.success).toHaveBeenCalledWith('Member invited');
    });

    it('calls setError and toastService.error on failure', async () => {
      const p = service.inviteMember('dept-1', { userId: 'u1', role: 'admin' });
      httpMock.expectOne('/api/departments/dept-1/members').flush(
        { message: 'User not found' },
        { status: 404, statusText: 'Not Found' },
      );
      await expect(p).rejects.toBeTruthy();
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('updateMemberRole()', () => {
    it('PUTs to /api/departments/:id/members/:userId and calls updateMember', async () => {
      const p = service.updateMemberRole('dept-1', 'user-1', UserRole.VIEWER);
      const responseWithViewer = { ...memberResponse, role: UserRole.VIEWER };
      httpMock.expectOne('/api/departments/dept-1/members/user-1').flush(responseWithViewer);
      await p;
      expect(mockDeptStore.updateMember).toHaveBeenCalledWith('user-1', 'viewer');
      expect(mockToastService.success).toHaveBeenCalledWith('Member role updated');
    });
  });

  describe('removeMember()', () => {
    it('DELETEs /api/departments/:id/members/:userId and calls removeMember', async () => {
      const p = service.removeMember('dept-1', 'user-1');
      httpMock.expectOne('/api/departments/dept-1/members/user-1').flush(null);
      await p;
      expect(mockDeptStore.removeMember).toHaveBeenCalledWith('user-1');
      expect(mockToastService.success).toHaveBeenCalledWith('Member removed');
    });
  });
});
