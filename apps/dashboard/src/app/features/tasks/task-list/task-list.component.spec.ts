import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskListComponent } from './task-list.component';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';
import { createMockAuthStore, createMockTaskStore, createMockDepartmentStore } from '../../../testing/mock-stores';
import { makeTask, makeUser, makeDepartment } from '../../../testing/test-fixtures';
import { ITask, TaskStatus } from '@task-management/data';

describe('TaskListComponent', () => {
  let fixture: ComponentFixture<TaskListComponent>;
  let component: TaskListComponent;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockTaskStore: ReturnType<typeof createMockTaskStore>;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockTaskService: { reorderTask: jest.Mock };

  const createFixture = () => {
    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockAuthStore = createMockAuthStore();
    mockTaskStore = createMockTaskStore();
    mockDeptStore = createMockDepartmentStore();
    mockTaskService = { reorderTask: jest.fn().mockResolvedValue(makeTask()) };

    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [
        { provide: TaskStore, useValue: mockTaskStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: TaskService, useValue: mockTaskService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TaskListComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('canDragTask()', () => {
    it('returns true for owner', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component['canDragTask'](makeTask())).toBe(true);
    });

    it('returns true for admin in current dept', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(makeDepartment({ id: 'dept-1' }));
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture();
      expect(component['canDragTask'](makeTask())).toBe(true);
    });

    it('returns true for viewer on own task (created)', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      createFixture();
      expect(component['canDragTask'](makeTask({ createdById: 'u1' }))).toBe(true);
    });

    it('returns true for viewer on assigned task', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      createFixture();
      expect(component['canDragTask'](makeTask({ assignedToId: 'u1', createdById: 'other' }))).toBe(true);
    });

    it('returns false for viewer on others task', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      createFixture();
      expect(component['canDragTask'](makeTask({ createdById: 'other', assignedToId: undefined }))).toBe(false);
    });
  });

  describe('canEditTask()', () => {
    it('returns false when no user', () => {
      mockAuthStore.user.mockReturnValue(null);
      createFixture();
      expect(component.canEditTask(makeTask())).toBe(false);
    });

    it('returns true for owner', () => {
      mockAuthStore.user.mockReturnValue(makeUser());
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component.canEditTask(makeTask())).toBe(true);
    });

    it('returns true for admin in dept', () => {
      mockAuthStore.user.mockReturnValue(makeUser());
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture();
      expect(component.canEditTask(makeTask({ departmentId: 'dept-1' }))).toBe(true);
    });

    it('returns true for task creator', () => {
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture();
      expect(component.canEditTask(makeTask({ createdById: 'u1' }))).toBe(true);
    });

    it('returns false for unrelated viewer', () => {
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      mockAuthStore.isOwner.mockReturnValue(false);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture();
      expect(component.canEditTask(makeTask({ createdById: 'other', assignedToId: undefined }))).toBe(false);
    });
  });

  describe('sort()', () => {
    it('sets sortBy and sortDirection=asc for new column', () => {
      mockTaskStore.filters.mockReturnValue({
        search: '',
        status: null,
        category: null,
        priority: null,
        sortBy: 'position',
        sortDirection: 'asc',
      });
      createFixture();
      component['sort']('title');
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ sortBy: 'title', sortDirection: 'asc' });
    });

    it('toggles sortDirection when same column clicked again', () => {
      mockTaskStore.filters.mockReturnValue({
        search: '',
        status: null,
        category: null,
        priority: null,
        sortBy: 'title',
        sortDirection: 'asc',
      });
      createFixture();
      component['sort']('title');
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ sortDirection: 'desc' });
    });

    it('toggles back to asc from desc', () => {
      mockTaskStore.filters.mockReturnValue({
        search: '',
        status: null,
        category: null,
        priority: null,
        sortBy: 'title',
        sortDirection: 'desc',
      });
      createFixture();
      component['sort']('title');
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ sortDirection: 'asc' });
    });
  });

  describe('onDrop()', () => {
    it('calls taskService.reorderTask for each affected task', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();

      const task1 = makeTask({ id: 't1', status: TaskStatus.TODO, position: 0 });
      const task2 = makeTask({ id: 't2', status: TaskStatus.TODO, position: 1 });
      component['tasks'].set([task1, task2]);

      const event: Partial<CdkDragDrop<ITask[]>> = {
        item: { data: task1 } as any,
        previousIndex: 0,
        currentIndex: 1,
        container: { data: [task1, task2] } as any,
        previousContainer: { data: [task1, task2] } as any,
      };

      component.onDrop(event as CdkDragDrop<ITask[]>);

      expect(mockTaskService.reorderTask).toHaveBeenCalled();
      expect(mockTaskStore.reorderTasks).toHaveBeenCalled();
    });

    it('does nothing if canDragTask returns false', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'u1' }));
      createFixture();

      const task = makeTask({ id: 't1', createdById: 'other' });
      component['tasks'].set([task]);

      const event: Partial<CdkDragDrop<ITask[]>> = {
        item: { data: task } as any,
        previousIndex: 0,
        currentIndex: 1,
        container: { data: [task] } as any,
        previousContainer: { data: [task] } as any,
      };

      component.onDrop(event as CdkDragDrop<ITask[]>);

      expect(mockTaskService.reorderTask).not.toHaveBeenCalled();
    });
  });
});
