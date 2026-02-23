import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HeaderComponent } from './header.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { OrganizationStore } from '../../../core/stores/organization.store';
import { AuthService } from '../../../core/services/auth.service';
import {
  createMockAuthStore,
  createMockUIStore,
  createMockDepartmentStore,
  createMockOrganizationStore,
} from '../../../testing/mock-stores';
import { makeUserRole, makeDepartment } from '../../../testing/test-fixtures';
import { UserRole } from '@task-management/data';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockUIStore: ReturnType<typeof createMockUIStore>;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockOrgStore: ReturnType<typeof createMockOrganizationStore>;
  let mockAuthService: { logout: jest.Mock };

  const createFixture = () => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockAuthStore = createMockAuthStore();
    mockUIStore = createMockUIStore();
    mockDeptStore = createMockDepartmentStore();
    mockOrgStore = createMockOrganizationStore();
    mockAuthService = { logout: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UIStore, useValue: mockUIStore },
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: OrganizationStore, useValue: mockOrgStore },
        { provide: AuthService, useValue: mockAuthService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(HeaderComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('currentRole', () => {
    it('returns Owner when isOwner is true', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component['currentRole']()).toBe('Owner');
    });

    it('returns Admin when getRoleForDepartment returns ADMIN', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartmentId.mockReturnValue('dept-1');
      mockAuthStore.getRoleForDepartment.mockReturnValue('ADMIN' as any);
      createFixture();
      expect(component['currentRole']()).toBe('Admin');
    });

    it('returns Viewer when getRoleForDepartment returns VIEWER', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartmentId.mockReturnValue('dept-1');
      mockAuthStore.getRoleForDepartment.mockReturnValue('VIEWER' as any);
      createFixture();
      expect(component['currentRole']()).toBe('Viewer');
    });

    it('uses displayRole when no currentDepartmentId', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartmentId.mockReturnValue(null);
      mockAuthStore.displayRole.mockReturnValue('Viewer');
      createFixture();
      expect(component['currentRole']()).toBe('Viewer');
    });
  });

  describe('accessibleDepartments', () => {
    const depts = [
      makeDepartment({ id: 'dept-1', name: 'Engineering' }),
      makeDepartment({ id: 'dept-2', name: 'Marketing' }),
    ];

    it('returns all departments for owner', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      mockDeptStore.departments.mockReturnValue(depts);
      createFixture();
      expect(component['accessibleDepartments']()).toHaveLength(2);
    });

    it('returns only depts with role for non-owner', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.departments.mockReturnValue(depts);
      mockAuthStore.userRoles.mockReturnValue([
        makeUserRole({ role: UserRole.ADMIN, departmentId: 'dept-1' }),
      ]);
      createFixture();
      const accessible = component['accessibleDepartments']();
      expect(accessible).toHaveLength(1);
      expect(accessible[0].id).toBe('dept-1');
    });
  });

  describe('showAllOption', () => {
    it('is true for owner', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component['showAllOption']()).toBe(true);
    });

    it('is false for non-owner', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      createFixture();
      expect(component['showAllOption']()).toBe(false);
    });
  });

  describe('toggleTheme()', () => {
    it('calls uiStore.toggleTheme', () => {
      createFixture();
      component.toggleTheme();
      expect(mockUIStore.toggleTheme).toHaveBeenCalled();
    });
  });

  describe('logout()', () => {
    it('calls authService.logout', () => {
      createFixture();
      component.logout();
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('onDepartmentChange()', () => {
    it('calls departmentStore.setCurrentDepartment with dept id', () => {
      createFixture();
      const event = { target: { value: 'dept-1' } } as unknown as Event;
      component.onDepartmentChange(event);
      expect(mockDeptStore.setCurrentDepartment).toHaveBeenCalledWith('dept-1');
    });

    it('calls setCurrentDepartment with null when empty value', () => {
      createFixture();
      const event = { target: { value: '' } } as unknown as Event;
      component.onDepartmentChange(event);
      expect(mockDeptStore.setCurrentDepartment).toHaveBeenCalledWith(null);
    });
  });

  describe('roleBadgeClasses()', () => {
    it('includes purple for Owner', () => {
      createFixture();
      expect(component.roleBadgeClasses('Owner')).toContain('purple');
    });

    it('includes blue for Admin', () => {
      createFixture();
      expect(component.roleBadgeClasses('Admin')).toContain('blue');
    });

    it('includes gray for Viewer', () => {
      createFixture();
      expect(component.roleBadgeClasses('Viewer')).toContain('gray');
    });
  });
});
