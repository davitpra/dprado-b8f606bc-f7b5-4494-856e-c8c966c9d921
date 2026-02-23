import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TaskDashboardComponent } from './task-board.component';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { DepartmentService } from '../../../core/services/department.service';
import { TaskService } from '../../../core/services/task.service';
import { KeyboardShortcutsService } from '../../../core/services/keyboard-shortcuts.service';
import {
  createMockAuthStore,
  createMockTaskStore,
  createMockDepartmentStore,
  createMockUIStore,
} from '../../../testing/mock-stores';
import { makeTask, makeDepartment } from '../../../testing/test-fixtures';

describe('TaskDashboardComponent', () => {
  let fixture: ComponentFixture<TaskDashboardComponent>;
  let component: TaskDashboardComponent;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;
  let mockTaskStore: ReturnType<typeof createMockTaskStore>;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockUIStore: ReturnType<typeof createMockUIStore>;
  let mockDeptService: { loadMembers: jest.Mock; loadOrgUsers: jest.Mock };
  let mockTaskService: { createTask: jest.Mock; updateTask: jest.Mock; deleteTask: jest.Mock };
  let mockShortcutsService: { newTaskTrigger: jest.Mock; escTrigger: jest.Mock; showHelp: jest.Mock; toggleHelp: jest.Mock };

  const createFixture = () => {
    fixture = TestBed.createComponent(TaskDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockAuthStore = createMockAuthStore();
    mockTaskStore = createMockTaskStore();
    mockDeptStore = createMockDepartmentStore();
    mockUIStore = createMockUIStore();
    mockDeptService = {
      loadMembers: jest.fn().mockResolvedValue(undefined),
      loadOrgUsers: jest.fn().mockResolvedValue([]),
    };
    mockTaskService = {
      createTask: jest.fn().mockResolvedValue(makeTask()),
      updateTask: jest.fn().mockResolvedValue(makeTask()),
      deleteTask: jest.fn().mockResolvedValue(undefined),
    };
    mockShortcutsService = {
      newTaskTrigger: jest.fn().mockReturnValue(0),
      escTrigger: jest.fn().mockReturnValue(0),
      showHelp: jest.fn().mockReturnValue(false),
      toggleHelp: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TaskDashboardComponent],
      providers: [
        { provide: TaskStore, useValue: mockTaskStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UIStore, useValue: mockUIStore },
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: DepartmentService, useValue: mockDeptService },
        { provide: TaskService, useValue: mockTaskService },
        { provide: KeyboardShortcutsService, useValue: mockShortcutsService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TaskDashboardComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('canCreateTask', () => {
    it('returns true when user is owner', () => {
      mockAuthStore.isOwner.mockReturnValue(true);
      createFixture();
      expect(component['canCreateTask']()).toBe(true);
    });

    it('returns true when user is admin in current dept', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(makeDepartment({ id: 'dept-1' }));
      mockAuthStore.isAdminInDepartment.mockReturnValue(true);
      createFixture();
      expect(component['canCreateTask']()).toBe(true);
    });

    it('returns false when viewer', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(makeDepartment({ id: 'dept-1' }));
      mockAuthStore.isAdminInDepartment.mockReturnValue(false);
      createFixture();
      expect(component['canCreateTask']()).toBe(false);
    });

    it('returns false when no current dept and not owner', () => {
      mockAuthStore.isOwner.mockReturnValue(false);
      mockDeptStore.currentDepartment.mockReturnValue(null);
      createFixture();
      expect(component['canCreateTask']()).toBe(false);
    });
  });

  describe('openModal / closeModal', () => {
    it('openModal sets showModal to true', () => {
      createFixture();
      component.openModal();
      expect(component['showModal']()).toBe(true);
    });

    it('openModal with task sets editingTask', () => {
      createFixture();
      const task = makeTask();
      component.openModal(task);
      expect(component['editingTask']()).toEqual(task);
    });

    it('closeModal sets showModal to false and clears editingTask', () => {
      createFixture();
      component.openModal(makeTask());
      component.closeModal();
      expect(component['showModal']()).toBe(false);
      expect(component['editingTask']()).toBeNull();
    });
  });

  describe('onSave()', () => {
    it('calls taskService.updateTask when editingTask is set', async () => {
      createFixture();
      const task = makeTask({ id: 't1' });
      component.openModal(task);
      await component.onSave({ title: 'Updated' });
      expect(mockTaskService.updateTask).toHaveBeenCalledWith('t1', { title: 'Updated' });
    });

    it('closes modal after update', async () => {
      createFixture();
      component.openModal(makeTask({ id: 't1' }));
      await component.onSave({});
      expect(component['showModal']()).toBe(false);
    });

    it('calls taskService.createTask when editingTask is null (with departmentId)', async () => {
      mockDeptStore.currentDepartmentId.mockReturnValue('dept-1');
      createFixture();
      await component.onSave({ title: 'New Task' });
      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: 'dept-1', title: 'New Task' }),
      );
    });

    it('does not create when no departmentId and no editing task', async () => {
      mockDeptStore.currentDepartmentId.mockReturnValue(null);
      createFixture();
      await component.onSave({ title: 'Orphan Task' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });
  });

  describe('onDeleteTask / confirmDelete', () => {
    it('onDeleteTask sets pendingDeleteTask', () => {
      createFixture();
      const task = makeTask();
      component.onDeleteTask(task);
      expect(component['pendingDeleteTask']()).toEqual(task);
    });

    it('confirmDelete calls taskService.deleteTask and clears pendingDeleteTask', async () => {
      createFixture();
      const task = makeTask({ id: 't1' });
      component.onDeleteTask(task);
      await component.confirmDelete();
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('t1');
      expect(component['pendingDeleteTask']()).toBeNull();
    });

    it('confirmDelete does nothing when no pendingDeleteTask', async () => {
      createFixture();
      await component.confirmDelete();
      expect(mockTaskService.deleteTask).not.toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('returns empty string when no pending task', () => {
      createFixture();
      expect(component['deleteMessage']()).toBe('');
    });

    it('returns message with task title', () => {
      createFixture();
      component.onDeleteTask(makeTask({ title: 'My Task' }));
      expect(component['deleteMessage']()).toContain('My Task');
    });
  });
});
