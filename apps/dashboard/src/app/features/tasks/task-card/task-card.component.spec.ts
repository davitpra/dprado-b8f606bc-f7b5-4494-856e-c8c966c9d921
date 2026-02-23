import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TaskCardComponent } from './task-card.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { createMockAuthStore, createMockDepartmentStore } from '../../../testing/mock-stores';
import { makeTask, makeUser } from '../../../testing/test-fixtures';
import { TaskStatus } from '@task-management/data';

describe('TaskCardComponent', () => {
  let fixture: ComponentFixture<TaskCardComponent>;
  let component: TaskCardComponent;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;

  const createFixture = (task = makeTask()) => {
    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockAuthStore = createMockAuthStore();
    mockDeptStore = createMockDepartmentStore();

    await TestBed.configureTestingModule({
      imports: [TaskCardComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: DepartmentStore, useValue: mockDeptStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TaskCardComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('renders task data', () => {
    it('renders task title in DOM', () => {
      const task = makeTask({ title: 'My Important Task' });
      createFixture(task);
      expect(fixture.nativeElement.textContent).toContain('My Important Task');
    });

    it('renders task priority', () => {
      const task = makeTask({ title: 'Task' });
      createFixture(task);
      expect(fixture.nativeElement.textContent).toContain(task.priority);
    });
  });

  describe('assignedUser', () => {
    it('returns null when task has no assignedToId', () => {
      const task = makeTask({ assignedToId: undefined });
      createFixture(task);
      expect(component['assignedUser']()).toBeNull();
    });

    it('returns user from allKnownUsers when assignedToId is set', () => {
      const assignedUser = makeUser({ id: 'u1', firstName: 'Jane' });
      const userMap = new Map([['u1', assignedUser]]);
      mockDeptStore.allKnownUsers.mockReturnValue(userMap);
      const task = makeTask({ assignedToId: 'u1' });
      createFixture(task);
      expect(component['assignedUser']()).toEqual(assignedUser);
    });

    it('returns null when assignedToId not in allKnownUsers', () => {
      mockDeptStore.allKnownUsers.mockReturnValue(new Map());
      const task = makeTask({ assignedToId: 'u-missing' });
      createFixture(task);
      expect(component['assignedUser']()).toBeNull();
    });
  });

  describe('canEdit', () => {
    it('returns false when user is null', () => {
      mockAuthStore.user.mockReturnValue(null);
      createFixture();
      expect(component['canEdit']()).toBe(false);
    });

    it('returns true when user is owner', () => {
      mockAuthStore.user.mockReturnValue(makeUser());
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component['canEdit']()).toBe(true);
    });

    it('returns true when user is admin in dept', () => {
      const task = makeTask({ departmentId: 'dept-1' });
      mockAuthStore.user.mockReturnValue(makeUser());
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture(task);
      expect(component['canEdit']()).toBe(true);
    });

    it('returns true when user is task creator', () => {
      const task = makeTask({ createdById: 'u1', departmentId: 'dept-1' });
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture(task);
      expect(component['canEdit']()).toBe(true);
    });

    it('returns false for viewer on others task', () => {
      const task = makeTask({ createdById: 'other-user', assignedToId: undefined });
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture(task);
      expect(component['canEdit']()).toBe(false);
    });
  });

  describe('edit and delete outputs', () => {
    it('emits edit output with task on onEdit()', () => {
      const task = makeTask();
      mockAuthStore.user.mockReturnValue(makeUser());
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture(task);

      const editSpy = jest.fn();
      component.edit.subscribe(editSpy);
      component.onEdit();
      expect(editSpy).toHaveBeenCalledWith(task);
    });

    it('emits delete output with task on onDelete()', () => {
      const task = makeTask();
      mockAuthStore.user.mockReturnValue(makeUser());
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture(task);

      const deleteSpy = jest.fn();
      component.delete.subscribe(deleteSpy);
      component.onDelete();
      expect(deleteSpy).toHaveBeenCalledWith(task);
    });
  });

  describe('DOM — canEdit toggle', () => {
    it('shows edit/delete buttons when canEdit is true', () => {
      const task = makeTask();
      mockAuthStore.user.mockReturnValue(makeUser({ id: task.createdById }));
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture(task);

      const editBtn = fixture.nativeElement.querySelector('[aria-label="Edit task"]');
      const deleteBtn = fixture.nativeElement.querySelector('[aria-label="Delete task"]');
      expect(editBtn).toBeTruthy();
      expect(deleteBtn).toBeTruthy();
    });

    it('hides edit/delete buttons when canEdit is false', () => {
      const task = makeTask({ createdById: 'other' });
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture(task);

      const editBtn = fixture.nativeElement.querySelector('[aria-label="Edit task"]');
      expect(editBtn).toBeNull();
    });
  });
});
