import { TestBed } from '@angular/core/testing';
import { DepartmentStore } from './department.store';
import { makeUser, makeDepartment } from '../../testing/test-fixtures';

describe('DepartmentStore', () => {
  let store: DepartmentStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(DepartmentStore);
  });

  describe('initial state', () => {
    it('departments is empty', () => {
      expect(store.departments()).toEqual([]);
    });

    it('currentDepartmentId is null', () => {
      expect(store.currentDepartmentId()).toBeNull();
    });

    it('currentDepartment is null', () => {
      expect(store.currentDepartment()).toBeNull();
    });

    it('members is empty', () => {
      expect(store.members()).toEqual([]);
    });

    it('orgUsers is empty', () => {
      expect(store.orgUsers()).toEqual([]);
    });
  });

  describe('currentDepartment', () => {
    it('returns matching department when id is set', () => {
      const dept = makeDepartment({ id: 'dept-1', name: 'Engineering' });
      store.setDepartments([dept]);
      store.setCurrentDepartment('dept-1');
      expect(store.currentDepartment()).toEqual(dept);
    });

    it('returns null when id does not match any department', () => {
      store.setDepartments([makeDepartment({ id: 'dept-1' })]);
      store.setCurrentDepartment('dept-999');
      expect(store.currentDepartment()).toBeNull();
    });

    it('returns null when currentDepartmentId is null', () => {
      store.setDepartments([makeDepartment({ id: 'dept-1' })]);
      expect(store.currentDepartment()).toBeNull();
    });
  });

  describe('setCurrentDepartment', () => {
    it('updates currentDepartmentId', () => {
      store.setCurrentDepartment('dept-1');
      expect(store.currentDepartmentId()).toBe('dept-1');
    });

    it('clears members when department changes', () => {
      store.setMembers([{ user: makeUser(), role: 'admin' }]);
      store.setCurrentDepartment('dept-1');
      expect(store.members()).toEqual([]);
    });

    it('accepts null to clear current department', () => {
      store.setCurrentDepartment('dept-1');
      store.setCurrentDepartment(null);
      expect(store.currentDepartmentId()).toBeNull();
    });
  });

  describe('addDepartment / updateDepartment / removeDepartment', () => {
    it('addDepartment appends to departments', () => {
      store.addDepartment(makeDepartment({ id: 'dept-1' }));
      expect(store.departments()).toHaveLength(1);
    });

    it('updateDepartment replaces matching department', () => {
      store.setDepartments([makeDepartment({ id: 'dept-1', name: 'Old' })]);
      store.updateDepartment(makeDepartment({ id: 'dept-1', name: 'New' }));
      expect(store.departments()[0].name).toBe('New');
    });

    it('removeDepartment removes matching department', () => {
      store.setDepartments([makeDepartment({ id: 'dept-1' }), makeDepartment({ id: 'dept-2' })]);
      store.removeDepartment('dept-1');
      expect(store.departments()).toHaveLength(1);
      expect(store.departments()[0].id).toBe('dept-2');
    });

    it('removeDepartment clears currentDepartmentId if removed dept was current', () => {
      store.setDepartments([makeDepartment({ id: 'dept-1' })]);
      store.setCurrentDepartment('dept-1');
      store.removeDepartment('dept-1');
      expect(store.currentDepartmentId()).toBeNull();
    });

    it('removeDepartment does not change currentDepartmentId if it was a different dept', () => {
      store.setDepartments([makeDepartment({ id: 'dept-1' }), makeDepartment({ id: 'dept-2' })]);
      store.setCurrentDepartment('dept-2');
      store.removeDepartment('dept-1');
      expect(store.currentDepartmentId()).toBe('dept-2');
    });
  });

  describe('member management', () => {
    it('addMember appends to members', () => {
      store.addMember({ user: makeUser({ id: 'u1' }), role: 'viewer' });
      expect(store.members()).toHaveLength(1);
    });

    it('removeMember removes matching member', () => {
      store.setMembers([
        { user: makeUser({ id: 'u1' }), role: 'admin' },
        { user: makeUser({ id: 'u2' }), role: 'viewer' },
      ]);
      store.removeMember('u1');
      expect(store.members()).toHaveLength(1);
      expect(store.members()[0].user.id).toBe('u2');
    });

    it('updateMember changes role for matching member', () => {
      store.setMembers([{ user: makeUser({ id: 'u1' }), role: 'viewer' }]);
      store.updateMember('u1', 'admin');
      expect(store.members()[0].role).toBe('admin');
    });
  });

  describe('allKnownUsers', () => {
    it('contains org users', () => {
      store.setOrgUsers([makeUser({ id: 'u1' })]);
      expect(store.allKnownUsers().has('u1')).toBe(true);
    });

    it('contains members', () => {
      store.setMembers([{ user: makeUser({ id: 'u2' }), role: 'admin' }]);
      expect(store.allKnownUsers().has('u2')).toBe(true);
    });

    it('members overwrite org users with same id', () => {
      store.setOrgUsers([makeUser({ id: 'u1', firstName: 'OrgFirst' })]);
      store.setMembers([{ user: makeUser({ id: 'u1', firstName: 'MemberFirst' }), role: 'admin' }]);
      expect(store.allKnownUsers().get('u1')?.firstName).toBe('MemberFirst');
    });

    it('merges both org users and members', () => {
      store.setOrgUsers([makeUser({ id: 'u1' })]);
      store.setMembers([{ user: makeUser({ id: 'u2' }), role: 'viewer' }]);
      expect(store.allKnownUsers().size).toBe(2);
    });
  });

  describe('setError / setLoading', () => {
    it('setError updates error signal', () => {
      store.setError('oops');
      expect(store.error()).toBe('oops');
    });

    it('setLoading updates isLoading signal', () => {
      store.setLoading(true);
      expect(store.isLoading()).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      store.setDepartments([makeDepartment()]);
      store.setCurrentDepartment('dept-1');
      store.setMembers([{ user: makeUser(), role: 'admin' }]);
      store.reset();

      expect(store.departments()).toEqual([]);
      expect(store.currentDepartmentId()).toBeNull();
      expect(store.members()).toEqual([]);
    });
  });
});
