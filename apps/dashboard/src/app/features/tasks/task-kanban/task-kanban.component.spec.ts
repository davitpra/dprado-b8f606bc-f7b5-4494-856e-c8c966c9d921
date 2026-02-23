import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskKanbanComponent } from './task-kanban.component';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';
import { ToastService } from '../../../core/services/toast.service';
import { createMockAuthStore, createMockTaskStore, createMockDepartmentStore, createMockToastService } from '../../../testing/mock-stores';
import { makeTask, makeUser, makeDepartment } from '../../../testing/test-fixtures';
import { ITask, TaskStatus } from '@task-management/data';

describe('TaskKanbanComponent', () => {
  let fixture: ComponentFixture<TaskKanbanComponent>;
  let component: TaskKanbanComponent;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockTaskStore: ReturnType<typeof createMockTaskStore>;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockTaskService: { reorderTask: jest.Mock };
  let mockToastService: ReturnType<typeof createMockToastService>;

  const createFixture = () => {
    fixture = TestBed.createComponent(TaskKanbanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockAuthStore = createMockAuthStore();
    mockTaskStore = createMockTaskStore();
    mockDeptStore = createMockDepartmentStore();
    mockTaskService = { reorderTask: jest.fn().mockResolvedValue(makeTask()) };
    mockToastService = createMockToastService();

    await TestBed.configureTestingModule({
      imports: [TaskKanbanComponent],
      providers: [
        { provide: TaskStore, useValue: mockTaskStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: TaskService, useValue: mockTaskService },
        { provide: ToastService, useValue: mockToastService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TaskKanbanComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('columns', () => {
    it('has 3 columns: To Do, In Progress, Done', () => {
      createFixture();
      const columns = component['columns'];
      expect(columns).toHaveLength(3);
      expect(columns[0].label).toBe('To Do');
      expect(columns[1].label).toBe('In Progress');
      expect(columns[2].label).toBe('Done');
    });

    it('columns have correct statuses', () => {
      createFixture();
      const statuses = component['columns'].map((c) => c.status);
      expect(statuses).toContain(TaskStatus.TODO);
      expect(statuses).toContain(TaskStatus.IN_PROGRESS);
      expect(statuses).toContain(TaskStatus.DONE);
    });
  });

  describe('canDragTask()', () => {
    it('returns true for owner', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      const task = makeTask();
      expect(component['canDragTask'](task)).toBe(true);
    });

    it('returns true for admin in current dept', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(makeDepartment({ id: 'dept-1' }));
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture();
      expect(component['canDragTask'](makeTask({ departmentId: 'dept-1' }))).toBe(true);
    });

    it('returns true for viewer on their own task (as creator)', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'user-1' }));
      createFixture();
      const task = makeTask({ createdById: 'user-1' });
      expect(component['canDragTask'](task)).toBe(true);
    });

    it('returns false for viewer on other users task', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'user-1' }));
      createFixture();
      const task = makeTask({ createdById: 'user-99', assignedToId: undefined });
      expect(component['canDragTask'](task)).toBe(false);
    });
  });

  describe('onDrop() — cross-column', () => {
    it('calls taskService.reorderTask with new status', async () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();

      const task = makeTask({ id: 't1', status: TaskStatus.TODO });
      const prevContainer = { id: TaskStatus.TODO, data: [task] } as any;
      const currContainer = { id: TaskStatus.IN_PROGRESS, data: [] } as any;

      const event: Partial<CdkDragDrop<ITask[]>> = {
        item: { data: task } as any,
        previousContainer: prevContainer,
        container: currContainer,
        previousIndex: 0,
        currentIndex: 0,
      };

      await component.onDrop(event as CdkDragDrop<ITask[]>);

      expect(mockTaskService.reorderTask).toHaveBeenCalledWith('t1', {
        status: TaskStatus.IN_PROGRESS,
        position: 0,
      });
    });

    it('calls toastService.success when moving to different column', async () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();

      const task = makeTask({ id: 't1', status: TaskStatus.TODO });
      const prevContainer = { id: TaskStatus.TODO, data: [task] } as any;
      const currContainer = { id: TaskStatus.IN_PROGRESS, data: [] } as any;

      const event: Partial<CdkDragDrop<ITask[]>> = {
        item: { data: task } as any,
        previousContainer: prevContainer,
        container: currContainer,
        previousIndex: 0,
        currentIndex: 0,
      };

      await component.onDrop(event as CdkDragDrop<ITask[]>);

      expect(mockToastService.success).toHaveBeenCalledWith('Task moved to In Progress');
    });
  });

  describe('onDrop() — same column', () => {
    it('does NOT call toastService.success for same-column reorder', async () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();

      const task = makeTask({ id: 't1', status: TaskStatus.TODO });
      const tasks = [task, makeTask({ id: 't2', status: TaskStatus.TODO })];
      const container = { id: TaskStatus.TODO, data: tasks } as any;

      const event: Partial<CdkDragDrop<ITask[]>> = {
        item: { data: task } as any,
        previousContainer: container,
        container: container,
        previousIndex: 0,
        currentIndex: 1,
      };

      await component.onDrop(event as CdkDragDrop<ITask[]>);

      expect(mockToastService.success).not.toHaveBeenCalled();
    });

    it('calls reorderTask for same-column items when owner', async () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();

      const task = makeTask({ id: 't1', status: TaskStatus.TODO });
      const task2 = makeTask({ id: 't2', status: TaskStatus.TODO });
      const tasks = [task, task2];
      const container = { id: TaskStatus.TODO, data: tasks } as any;

      const event: Partial<CdkDragDrop<ITask[]>> = {
        item: { data: task } as any,
        previousContainer: container,
        container: container,
        previousIndex: 0,
        currentIndex: 1,
      };

      await component.onDrop(event as CdkDragDrop<ITask[]>);

      expect(mockTaskStore.reorderTasks).toHaveBeenCalled();
    });
  });

  describe('onDrop() — permission check', () => {
    it('does nothing when canDragTask returns false', async () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      mockAuthStore.user.mockReturnValue(makeUser({ id: 'other-user' }));
      createFixture();

      const task = makeTask({ id: 't1', createdById: 'user-99' });
      const container = { id: TaskStatus.TODO, data: [task] } as any;
      const event: Partial<CdkDragDrop<ITask[]>> = {
        item: { data: task } as any,
        previousContainer: container,
        container: { id: TaskStatus.IN_PROGRESS, data: [] } as any,
        previousIndex: 0,
        currentIndex: 0,
      };

      await component.onDrop(event as CdkDragDrop<ITask[]>);

      expect(mockTaskService.reorderTask).not.toHaveBeenCalled();
    });
  });
});
