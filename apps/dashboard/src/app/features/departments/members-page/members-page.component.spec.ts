import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MembersPageComponent } from './members-page.component';
import { DepartmentStore } from '../../../core/stores/department.store';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthStore } from '../../../core/stores/auth.store';
import { createMockDepartmentStore, createMockAuthStore } from '../../../testing/mock-stores';
import { makeUser } from '../../../testing/test-fixtures';
import { UserRole } from '@task-management/data';

describe('MembersPageComponent', () => {
  let fixture: ComponentFixture<MembersPageComponent>;
  let component: MembersPageComponent;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockDeptService: {
    loadMembers: jest.Mock;
    removeMember: jest.Mock;
    updateMemberRole: jest.Mock;
  };
  let mockRoute: { snapshot: { paramMap: { get: jest.Mock } } };

  const createFixture = () => {
    fixture = TestBed.createComponent(MembersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockDeptStore = createMockDepartmentStore();
    mockAuthStore = createMockAuthStore();
    mockDeptService = {
      loadMembers: jest.fn().mockResolvedValue(undefined),
      removeMember: jest.fn().mockResolvedValue(undefined),
      updateMemberRole: jest.fn().mockResolvedValue(undefined),
    };
    mockRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('dept-1') } },
    };

    await TestBed.configureTestingModule({
      imports: [MembersPageComponent],
      providers: [
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: DepartmentService, useValue: mockDeptService },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(MembersPageComponent, { set: { imports: [] } })
      .compileComponents();
  });

  it('loads deptId from route and calls loadMembers on init', () => {
    createFixture();
    expect(component['deptId']).toBe('dept-1');
    expect(mockDeptService.loadMembers).toHaveBeenCalledWith('dept-1');
    expect(mockDeptStore.setCurrentDepartment).toHaveBeenCalledWith('dept-1');
  });

  describe('canInvite', () => {
    it('returns true for owner', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component['canInvite']()).toBe(true);
    });

    it('returns true for admin in dept', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture();
      expect(component['canInvite']()).toBe(true);
    });

    it('returns false for viewer', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture();
      expect(component['canInvite']()).toBe(false);
    });
  });

  describe('canEditRole()', () => {
    it('returns true for owner', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component.canEditRole()).toBe(true);
    });

    it('returns false for non-owner', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      createFixture();
      expect(component.canEditRole()).toBe(false);
    });
  });

  describe('canRemoveMember()', () => {
    const adminMember = { user: makeUser({ id: 'admin-1' }), role: 'admin' as const };
    const viewerMember = { user: makeUser({ id: 'viewer-1' }), role: 'viewer' as const };

    it('owner can remove anyone', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component.canRemoveMember(adminMember)).toBe(true);
      expect(component.canRemoveMember(viewerMember)).toBe(true);
    });

    it('admin can remove viewer', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture();
      expect(component.canRemoveMember(viewerMember)).toBe(true);
    });

    it('admin cannot remove another admin', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture();
      expect(component.canRemoveMember(adminMember)).toBe(false);
    });

    it('viewer cannot remove anyone', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture();
      expect(component.canRemoveMember(viewerMember)).toBe(false);
    });
  });

  describe('invite modal', () => {
    it('openInviteModal sets showInviteModal to true', () => {
      createFixture();
      component.openInviteModal();
      expect(component['showInviteModal']()).toBe(true);
    });

    it('closeInviteModal sets showInviteModal to false', () => {
      createFixture();
      component.openInviteModal();
      component.closeInviteModal();
      expect(component['showInviteModal']()).toBe(false);
    });
  });

  describe('confirmRemove / cancelRemove / onRemoveConfirmed', () => {
    const member = { user: makeUser({ id: 'u1' }), role: 'viewer' as const };

    it('confirmRemove sets removingMember and showConfirmDialog', () => {
      createFixture();
      component.confirmRemove(member);
      expect(component['removingMember']()).toEqual(member);
      expect(component['showConfirmDialog']()).toBe(true);
    });

    it('cancelRemove clears state', () => {
      createFixture();
      component.confirmRemove(member);
      component.cancelRemove();
      expect(component['removingMember']()).toBeNull();
      expect(component['showConfirmDialog']()).toBe(false);
    });

    it('onRemoveConfirmed calls departmentService.removeMember', async () => {
      createFixture();
      component.confirmRemove(member);
      await component.onRemoveConfirmed();
      expect(mockDeptService.removeMember).toHaveBeenCalledWith('dept-1', 'u1');
    });

    it('onRemoveConfirmed clears state', async () => {
      createFixture();
      component.confirmRemove(member);
      await component.onRemoveConfirmed();
      expect(component['removingMember']()).toBeNull();
      expect(component['showConfirmDialog']()).toBe(false);
    });

    it('onRemoveConfirmed does nothing when no removingMember', async () => {
      createFixture();
      await component.onRemoveConfirmed();
      expect(mockDeptService.removeMember).not.toHaveBeenCalled();
    });
  });

  describe('updateRole()', () => {
    const member = { user: makeUser({ id: 'u1' }), role: 'viewer' as const };

    it('calls departmentService.updateMemberRole', async () => {
      createFixture();
      await component.updateRole(member, UserRole.ADMIN);
      expect(mockDeptService.updateMemberRole).toHaveBeenCalledWith('dept-1', 'u1', UserRole.ADMIN);
    });

    it('does not call when role is same (case-insensitive)', async () => {
      const adminMember = { user: makeUser({ id: 'u1' }), role: 'admin' as const };
      createFixture();
      await component.updateRole(adminMember, UserRole.ADMIN);
      expect(mockDeptService.updateMemberRole).not.toHaveBeenCalled();
    });
  });
});
