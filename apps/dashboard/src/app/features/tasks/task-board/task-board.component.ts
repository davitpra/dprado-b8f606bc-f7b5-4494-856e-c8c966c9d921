import { Component, inject, computed, signal, effect } from '@angular/core';
import { ITask } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { DepartmentService } from '../../../core/services/department.service';
import { TaskService } from '../../../core/services/task.service';
import { TaskKanbanComponent } from '../task-kanban/task-kanban.component';
import { TaskModalComponent } from '../task-modal/task-modal.component';
import { TaskFiltersComponent } from '../task-filters/task-filters.component';
import { TaskListComponent } from '../task-list/task-list.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-task-dashboard',
  standalone: true,
  imports: [
    TaskKanbanComponent,
    TaskListComponent,
    TaskFiltersComponent,
    TaskModalComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h1 class="m-0 text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        @if (canCreateTask()) {
          <button
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-md cursor-pointer text-sm font-medium"
            (click)="openModal()">
            + New Task
          </button>
        }
      </div>

      <app-task-filters />

      @if (uiStore.taskView() === 'kanban') {
        <app-task-kanban (editTask)="openModal($event)" (deleteTask)="onDeleteTask($event)" />
      } @else {
        <app-task-list (editTask)="openModal($event)" (deleteTask)="onDeleteTask($event)" />
      }

      @if (showModal()) {
        <app-task-modal [editTask]="editingTask()" (closed)="closeModal()" (saved)="onSave($event)" />
      }

      @if (pendingDeleteTask()) {
        <app-confirm-dialog
          title="Delete Task"
          [message]="deleteMessage()"
          confirmLabel="Delete"
          (confirmed)="confirmDelete()"
          (cancelled)="pendingDeleteTask.set(null)"
        />
      }
    </div>
  `,
})
export class TaskDashboardComponent {
  protected taskStore = inject(TaskStore);
  protected authStore = inject(AuthStore);
  protected uiStore = inject(UIStore);
  private departmentStore = inject(DepartmentStore);
  private departmentService = inject(DepartmentService);
  private taskService = inject(TaskService);

  protected showModal = signal(false);
  protected editingTask = signal<ITask | null>(null);
  protected pendingDeleteTask = signal<ITask | null>(null);

  protected canCreateTask = computed(() => {
    if (this.authStore.isOwner()) return true;
    const dept = this.departmentStore.currentDepartment();
    return dept ? this.authStore.isAdminInDepartment(dept.id) : false;
  });

  protected deleteMessage = computed(() => {
    const task = this.pendingDeleteTask();
    return task ? `Are you sure you want to delete "${task.title}"? This action cannot be undone.` : '';
  });

  constructor() {
    effect(() => {
      const deptId = this.departmentStore.currentDepartmentId();
      if (deptId) {
        this.departmentService.loadMembers(deptId);
      }
    });
  }

  openModal(task: ITask | null = null): void {
    this.editingTask.set(task);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingTask.set(null);
  }

  async onSave(values: Record<string, unknown>): Promise<void> {
    const editing = this.editingTask();
    try {
      if (editing) {
        await this.taskService.updateTask(editing.id, values);
      } else {
        const deptId = this.departmentStore.currentDepartmentId();
        if (deptId) {
          await this.taskService.createTask({ ...values, departmentId: deptId } as Partial<ITask>);
        }
      }
      this.closeModal();
    } catch {
      // Error is set in TaskStore by TaskService
    }
  }

  onDeleteTask(task: ITask): void {
    this.pendingDeleteTask.set(task);
  }

  async confirmDelete(): Promise<void> {
    const task = this.pendingDeleteTask();
    if (!task) return;
    this.pendingDeleteTask.set(null);
    await this.taskService.deleteTask(task.id);
  }
}
