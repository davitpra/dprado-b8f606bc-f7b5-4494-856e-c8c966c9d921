import { Component, inject, computed, output } from '@angular/core';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragPlaceholder, moveItemInArray } from '@angular/cdk/drag-drop';
import { ITask, TaskStatus } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';
import { TaskCardComponent } from '../task-card/task-card.component';

@Component({
  selector: 'app-task-kanban',
  standalone: true,
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, TaskCardComponent],
  template: `
    <div class="hidden md:grid md:grid-cols-3 gap-4 items-start">
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
                <app-task-card [task]="task" (edit)="editTask.emit($event)" (delete)="deleteTask.emit($event)" />
                <div *cdkDragPlaceholder class="bg-indigo-100 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-400 rounded-lg h-[60px] mb-2"></div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class TaskKanbanComponent {
  editTask = output<ITask>();
  deleteTask = output<ITask>();

  protected taskStore = inject(TaskStore);
  private authStore = inject(AuthStore);
  private departmentStore = inject(DepartmentStore);
  private taskService = inject(TaskService);

  protected columns = [
    { status: TaskStatus.TODO, label: 'To Do' },
    { status: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { status: TaskStatus.DONE, label: 'Done' },
  ];

  protected connectedLists = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];

  protected canDragDrop = computed(() => {
    if (this.authStore.isOwner()) return true;
    const dept = this.departmentStore.currentDepartment();
    return dept ? this.authStore.isAdminInDepartment(dept.id) : false;
  });

  async onDrop(event: CdkDragDrop<ITask[]>): Promise<void> {
    if (!this.canDragDrop()) return;

    if (event.previousContainer === event.container) {
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      const updated = items.map((t, i) => ({ ...t, position: i }));
      this.taskStore.reorderTasks(updated);
      for (const t of updated) {
        this.taskService.reorderTask(t.id, { status: t.status, position: t.position });
      }
    } else {
      const newStatus = event.container.id as TaskStatus;
      const task = event.item.data as ITask;
      const newPosition = event.currentIndex;
      this.taskStore.updateTask({ ...task, status: newStatus, position: newPosition });
      await this.taskService.reorderTask(task.id, { status: newStatus, position: newPosition });
    }
  }
}
