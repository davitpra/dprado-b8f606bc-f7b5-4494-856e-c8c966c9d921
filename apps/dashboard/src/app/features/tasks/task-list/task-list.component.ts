import { Component, inject, computed, signal, effect, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  CdkDropList,
  CdkDrag,
  CdkDragHandle,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGripVertical, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { ITask } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [DatePipe, CdkDropList, CdkDrag, CdkDragHandle, NgIcon],
  providers: [provideIcons({ lucideGripVertical, lucidePencil, lucideTrash2 })],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
      @if (tasks().length === 0) {
        <div class="p-12 text-center text-gray-500 dark:text-gray-400">
          <p>No tasks found. Try adjusting your filters.</p>
        </div>
      } @else {
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="w-8 px-2 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700"></th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Title</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Status</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Priority</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Category</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Due Date</th>
              <th class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700"></th>
            </tr>
          </thead>
          <tbody cdkDropList (cdkDropListDropped)="onDrop($event)">
            @for (task of tasks(); track task.id) {
              <tr cdkDrag [cdkDragDisabled]="!canDragList()" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td class="w-8 px-2 py-3 border-b border-gray-100 dark:border-gray-700">
                  @if (canDragList()) {
                    <ng-icon cdkDragHandle name="lucideGripVertical" size="16"
                      class="text-gray-400 dark:text-gray-500 cursor-grab block" />
                  }
                </td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-gray-100">{{ task.title }}</td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm">
                  @switch (task.status) {
                    @case ('TODO') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{{ task.status }}</span>
                    }
                    @case ('IN_PROGRESS') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{{ task.status }}</span>
                    }
                    @case ('DONE') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{{ task.status }}</span>
                    }
                  }
                </td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm">
                  @switch (task.priority) {
                    @case ('HIGH') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">{{ task.priority }}</span>
                    }
                    @case ('MEDIUM') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{{ task.priority }}</span>
                    }
                    @case ('LOW') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{{ task.priority }}</span>
                    }
                  }
                </td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">{{ task.category }}</td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">{{ task.dueDate ? (task.dueDate | date:'mediumDate') : '—' }}</td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  @if (canEditTask(task)) {
                    <div class="flex gap-1">
                      <button
                        class="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 cursor-pointer border-none bg-transparent"
                        aria-label="Edit task"
                        (click)="editTask.emit(task)">
                        <ng-icon name="lucidePencil" size="14" />
                      </button>
                      <button
                        class="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 cursor-pointer border-none bg-transparent"
                        aria-label="Delete task"
                        (click)="deleteTask.emit(task)">
                        <ng-icon name="lucideTrash2" size="14" />
                      </button>
                    </div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class TaskListComponent {
  editTask = output<ITask>();
  deleteTask = output<ITask>();

  private taskStore = inject(TaskStore);
  private authStore = inject(AuthStore);
  private departmentStore = inject(DepartmentStore);
  private taskService = inject(TaskService);

  protected tasks = signal<ITask[]>([]);

  protected canDragList = computed(() => {
    if (this.authStore.isOwner()) return true;
    const dept = this.departmentStore.currentDepartment();
    return dept ? this.authStore.isAdminInDepartment(dept.id) : false;
  });

  constructor() {
    effect(() => {
      this.tasks.set(this.taskStore.filteredTasks());
    });
  }

  canEditTask(task: ITask): boolean {
    const user = this.authStore.user();
    if (!user) return false;
    if (this.authStore.isOwner()) return true;
    if (this.authStore.isAdminInDepartment(task.departmentId)) return true;
    return task.createdById === user.id; // Viewer: only own tasks
  }

  onDrop(event: CdkDragDrop<ITask[]>): void {
    if (!this.canDragList()) return;
    const localTasks = [...this.tasks()];
    moveItemInArray(localTasks, event.previousIndex, event.currentIndex);
    this.tasks.set(localTasks);

    // Update positions for tasks with the same status as the dragged task
    const draggedTask = localTasks[event.currentIndex];
    const status = draggedTask.status;
    const sameStatusTasks = localTasks
      .filter((t) => t.status === status)
      .map((t, i) => ({ ...t, position: i }));

    this.taskStore.reorderTasks(sameStatusTasks);
    for (const t of sameStatusTasks) {
      this.taskService.reorderTask(t.id, { status: t.status, position: t.position });
    }
  }
}
