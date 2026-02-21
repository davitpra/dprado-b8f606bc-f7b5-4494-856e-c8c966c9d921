import { Component, inject, computed, signal } from '@angular/core';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragPlaceholder, moveItemInArray } from '@angular/cdk/drag-drop';
import { ITask, TaskStatus } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskModalComponent } from '../task-modal/task-modal.component';
import { TaskFiltersComponent } from '../task-filters/task-filters.component';
import { TaskListComponent } from '../task-list/task-list.component';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, TaskCardComponent, TaskModalComponent, TaskFiltersComponent, TaskListComponent],
  template: `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h1 class="m-0 text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        @if (canCreateTask()) {
          <button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-md cursor-pointer text-sm font-medium"
            (click)="openModal()">+ New Task</button>
        }
      </div>

      <app-task-filters />

      @if (uiStore.taskView() === 'kanban') {
        <div class="grid grid-cols-3 gap-4 items-start">
          @for (col of columns; track col.status) {
            <div class="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
              <div class="flex justify-between items-center mb-3">
                <span class="font-semibold text-sm text-gray-700 dark:text-gray-200">{{ col.label }}</span>
                <span class="bg-white dark:bg-gray-700 rounded-full px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {{ taskStore.tasksByStatus()[col.status].length }}
                </span>
              </div>
              <div
                cdkDropList
                [id]="col.status"
                [cdkDropListData]="taskStore.tasksByStatus()[col.status]"
                [cdkDropListConnectedTo]="connectedLists"
                (cdkDropListDropped)="onDrop($event)"
                class="min-h-[80px]"
              >
                @for (task of taskStore.tasksByStatus()[col.status]; track task.id) {
                  <div cdkDrag [cdkDragData]="task" [cdkDragDisabled]="!canDragDrop()">
                    <app-task-card [task]="task" (edit)="openModal($event)" (delete)="onDeleteTask($event)" />
                    <div *cdkDragPlaceholder class="bg-indigo-100 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-400 rounded-lg h-[60px] mb-2"></div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <app-task-list />
      }

      @if (showModal()) {
        <app-task-modal [editTask]="editingTask()" (closed)="closeModal()" (saved)="onSave($event)" />
      }
    </div>
  `,
})
export class TaskBoardComponent {
  protected taskStore = inject(TaskStore);
  protected authStore = inject(AuthStore);
  protected uiStore = inject(UIStore);
  private departmentStore = inject(DepartmentStore);
  private taskService = inject(TaskService);

  protected showModal = signal(false);
  protected editingTask = signal<ITask | null>(null);

  protected columns = [
    { status: TaskStatus.TODO, label: 'To Do' },
    { status: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { status: TaskStatus.DONE, label: 'Done' },
  ];

  protected connectedLists = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];

  protected canCreateTask = computed(() => {
    if (this.authStore.isOwner()) return true;
    const dept = this.departmentStore.currentDepartment();
    return dept ? this.authStore.isAdminInDepartment(dept.id) : false;
  });

  protected canDragDrop = computed(() => {
    if (this.authStore.isOwner()) return true;
    const dept = this.departmentStore.currentDepartment();
    return dept ? this.authStore.isAdminInDepartment(dept.id) : false;
  });

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

  async onDeleteTask(task: ITask): Promise<void> {
    await this.taskService.deleteTask(task.id);
  }

  async onDrop(event: CdkDragDrop<ITask[]>): Promise<void> {
    if (!this.canDragDrop()) return;

    if (event.previousContainer === event.container) {
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      const updated = items.map((t, i) => ({ ...t, position: i }));
      this.taskStore.reorderTasks(updated);
      // Persist each reorder
      for (const t of updated) {
        this.taskService.reorderTask(t.id, { status: t.status, position: t.position });
      }
    } else {
      const newStatus = event.container.id as TaskStatus;
      const task = event.item.data as ITask;
      const newPosition = event.currentIndex;
      // Optimistic update
      this.taskStore.updateTask({ ...task, status: newStatus, position: newPosition });
      await this.taskService.reorderTask(task.id, { status: newStatus, position: newPosition });
    }
  }
}
