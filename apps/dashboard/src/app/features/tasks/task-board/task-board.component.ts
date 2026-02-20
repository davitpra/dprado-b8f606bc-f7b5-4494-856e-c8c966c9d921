import { Component, inject, computed, signal } from '@angular/core';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragPlaceholder, moveItemInArray } from '@angular/cdk/drag-drop';
import { ITask, TaskStatus } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { UIStore } from '../../../core/stores/ui.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskModalComponent } from '../task-modal/task-modal.component';
import { TaskFiltersComponent } from '../task-filters/task-filters.component';
import { TaskListComponent } from '../task-list/task-list.component';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, TaskCardComponent, TaskModalComponent, TaskFiltersComponent, TaskListComponent],
  template: `
    <div class="tasks-page">
      <div class="page-header">
        <h1>Tasks</h1>
        @if (canCreateTask()) {
          <button class="btn-primary" (click)="openModal()">+ New Task</button>
        }
      </div>

      <app-task-filters />

      @if (uiStore.taskView() === 'kanban') {
        <div class="kanban-board">
          @for (col of columns; track col.status) {
            <div class="kanban-column">
              <div class="column-header">
                <span class="column-title">{{ col.label }}</span>
                <span class="task-count">
                  {{ taskStore.tasksByStatus()[col.status].length }}
                </span>
              </div>
              <div
                cdkDropList
                [id]="col.status"
                [cdkDropListData]="taskStore.tasksByStatus()[col.status]"
                [cdkDropListConnectedTo]="connectedLists"
                (cdkDropListDropped)="onDrop($event)"
                class="drop-zone"
              >
                @for (task of taskStore.tasksByStatus()[col.status]; track task.id) {
                  <div cdkDrag [cdkDragData]="task" [cdkDragDisabled]="!canDragDrop()">
                    <app-task-card [task]="task" />
                    <div *cdkDragPlaceholder class="drag-placeholder"></div>
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
        <app-task-modal [editTask]="editingTask()" (closed)="closeModal()" />
      }
    </div>
  `,
  styles: [`
    .tasks-page { }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .page-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .btn-primary {
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .btn-primary:hover { background: #2563eb; }
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      align-items: start;
    }
    .kanban-column {
      background: #f3f4f6;
      border-radius: 0.5rem;
      padding: 0.75rem;
    }
    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .column-title { font-weight: 600; font-size: 0.875rem; color: #374151; }
    .task-count {
      background: white;
      border-radius: 9999px;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }
    .drop-zone { min-height: 80px; }
    .drag-placeholder {
      background: #e0e7ff;
      border: 2px dashed #6366f1;
      border-radius: 0.5rem;
      height: 60px;
      margin-bottom: 0.5rem;
    }
  `],
})
export class TaskBoardComponent {
  protected taskStore = inject(TaskStore);
  protected authStore = inject(AuthStore);
  protected uiStore = inject(UIStore);
  private departmentStore = inject(DepartmentStore);

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

  onDrop(event: CdkDragDrop<ITask[]>): void {
    if (!this.canDragDrop()) return;

    if (event.previousContainer === event.container) {
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      const updated = items.map((t, i) => ({ ...t, position: i }));
      this.taskStore.reorderTasks(updated);
    } else {
      const newStatus = event.container.id as TaskStatus;
      const task = event.item.data as ITask;
      this.taskStore.updateTask({ ...task, status: newStatus });
    }
  }
}
