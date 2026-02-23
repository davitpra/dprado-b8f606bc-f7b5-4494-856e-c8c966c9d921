import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { InviteMemberModalComponent } from './invite-member-modal.component';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentStore } from '../../../core/stores/department.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { createMockDepartmentStore, createMockAuthStore } from '../../../testing/mock-stores';
import { makeUser } from '../../../testing/test-fixtures';
import { UserRole } from '@task-management/data';

describe('InviteMemberModalComponent', () => {
  let fixture: ComponentFixture<InviteMemberModalComponent>;
  let component: InviteMemberModalComponent;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockDeptService: {
    loadOrgUsers: jest.Mock;
    inviteMember: jest.Mock;
    createOrgUser: jest.Mock;
  };

  const orgUser1 = makeUser({ id: 'u1', isOwner: false });
  const orgUser2 = makeUser({ id: 'u2', isOwner: false });
  const ownerUser = makeUser({ id: 'owner-1', isOwner: true });

  const createFixture = async () => {
    fixture = TestBed.createComponent(InviteMemberModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('departmentId', 'dept-1');
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    mockDeptStore = createMockDepartmentStore();
    mockAuthStore = createMockAuthStore();
    mockDeptService = {
      loadOrgUsers: jest.fn().mockResolvedValue([orgUser1, orgUser2, ownerUser]),
      inviteMember: jest.fn().mockResolvedValue(undefined),
      createOrgUser: jest.fn().mockResolvedValue(makeUser({ id: 'new-user' })),
    };

    await TestBed.configureTestingModule({
      imports: [InviteMemberModalComponent],
      providers: [
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: DepartmentService, useValue: mockDeptService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(InviteMemberModalComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('initialization', () => {
    it('calls loadOrgUsers on init', async () => {
      await createFixture();
      expect(mockDeptService.loadOrgUsers).toHaveBeenCalled();
    });

    it('sets orgUsers from loaded users', async () => {
      await createFixture();
      expect(component['orgUsers']()).toHaveLength(3);
    });

    it('default mode is existing', async () => {
      await createFixture();
      expect(component['mode']()).toBe('existing');
    });
  });

  describe('availableUsers', () => {
    it('filters out owners', async () => {
      await createFixture();
      component['orgUsers'].set([orgUser1, orgUser2, ownerUser]);
      expect(component['availableUsers']()).not.toContain(ownerUser);
    });

    it('filters out already-invited members', async () => {
      mockDeptStore.members.mockReturnValue([{ user: orgUser1, role: 'admin' }]);
      await createFixture();
      component['orgUsers'].set([orgUser1, orgUser2]);
      const available = component['availableUsers']();
      expect(available.some((u) => u.id === 'u1')).toBe(false);
      expect(available.some((u) => u.id === 'u2')).toBe(true);
    });
  });

  describe('setMode()', () => {
    it('switches to new mode', async () => {
      await createFixture();
      component.setMode('new');
      expect(component['mode']()).toBe('new');
    });

    it('clears store error on mode switch', async () => {
      await createFixture();
      component.setMode('new');
      expect(mockDeptStore.setError).toHaveBeenCalledWith(null);
    });
  });

  describe('canCreateUser', () => {
    it('returns true for owner', async () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      await createFixture();
      expect(component['canCreateUser']()).toBe(true);
    });

    it('returns false for non-owner', async () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      await createFixture();
      expect(component['canCreateUser']()).toBe(false);
    });
  });

  describe('submitExisting (onSubmit in existing mode)', () => {
    it('calls inviteMember with userId and role', async () => {
      await createFixture();
      component['form'].patchValue({ userId: 'u1', role: UserRole.VIEWER });
      await component.onSubmit();
      expect(mockDeptService.inviteMember).toHaveBeenCalledWith('dept-1', {
        userId: 'u1',
        role: UserRole.VIEWER,
      });
    });

    it('does not call inviteMember if form is invalid', async () => {
      await createFixture();
      // userId is required but not set
      await component.onSubmit();
      expect(mockDeptService.inviteMember).not.toHaveBeenCalled();
    });

    it('emits closed after successful invite', async () => {
      await createFixture();
      const closedSpy = jest.fn();
      component.closed.subscribe(closedSpy);

      component['form'].patchValue({ userId: 'u1', role: UserRole.VIEWER });
      await component.onSubmit();
      expect(closedSpy).toHaveBeenCalled();
    });
  });

  describe('submitNew (onSubmit in new mode)', () => {
    const validNewUser = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'Password123!',
      role: UserRole.VIEWER,
    };

    it('calls createOrgUser then inviteMember', async () => {
      await createFixture();
      component.setMode('new');
      component['createUserForm'].patchValue(validNewUser);
      await component.onSubmit();

      expect(mockDeptService.createOrgUser).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'Password123!',
      });
      expect(mockDeptService.inviteMember).toHaveBeenCalledWith('dept-1', {
        userId: 'new-user',
        role: UserRole.VIEWER,
      });
    });

    it('does not submit when createUserForm is invalid', async () => {
      await createFixture();
      component.setMode('new');
      await component.onSubmit();
      expect(mockDeptService.createOrgUser).not.toHaveBeenCalled();
    });

    it('invalid password pattern fails validation', async () => {
      await createFixture();
      component.setMode('new');
      component['createUserForm'].patchValue({ ...validNewUser, password: 'alllower123' });
      expect(component['createUserForm'].get('password')?.invalid).toBe(true);
    });
  });

  describe('onClose()', () => {
    it('clears store error and emits closed', async () => {
      await createFixture();
      const closedSpy = jest.fn();
      component.closed.subscribe(closedSpy);

      component.onClose();
      expect(mockDeptStore.setError).toHaveBeenCalledWith(null);
      expect(closedSpy).toHaveBeenCalled();
    });
  });
});
