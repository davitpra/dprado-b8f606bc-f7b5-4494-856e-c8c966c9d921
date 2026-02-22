import { Component, inject, signal, computed, effect, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  CdkDropList,
  CdkDrag,
  CdkDragHandle,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideGripVertical, lucidePencil, lucideTrash2, lucideUser,
  lucideArrowUp, lucideArrowDown, lucideChevronsUpDown, lucideCalendar,
} from '@ng-icons/lucide';
import { ITask } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [DatePipe, CdkDropList, CdkDrag, CdkDragHandle, NgIcon],
  providers: [
    provideIcons({
      lucideGripVertical, lucidePencil, lucideTrash2, lucideUser,
      lucideArrowUp, lucideArrowDown, lucideChevronsUpDown, lucideCalendar,
    }),
  ],
  templateUrl: './task-list.component.html',
})
export class TaskListComponent {
  editTask = output<ITask>();
  deleteTask = output<ITask>();

  private taskStore = inject(TaskStore);
  private authStore = inject(AuthStore);
  private departmentStore = inject(DepartmentStore);
  private taskService = inject(TaskService);

  protected tasks = signal<ITask[]>([]);
  protected readonly filters = computed(() => this.taskStore.filters());

  protected canDragTask(task: ITask): boolean {
    if (this.authStore.isOwner()) return true;
    const dept = this.departmentStore.currentDepartment();
    if (dept && this.authStore.isAdminInDepartment(dept.id)) return true;
    const user = this.authStore.user();
    return !!user && (task.createdById === user.id || task.assignedToId === user.id);
  }

  constructor() {
    effect(() => {
      this.tasks.set(this.taskStore.filteredTasks());
    });
  }

  getAssignedUser(task: ITask) {
    if (!task.assignedToId) return null;
    return this.departmentStore.allKnownUsers().get(task.assignedToId) ?? null;
  }

  canEditTask(task: ITask): boolean {
    const user = this.authStore.user();
    if (!user) return false;
    if (this.authStore.isOwner()) return true;
    if (this.authStore.isAdminInDepartment(task.departmentId)) return true;
    return task.createdById === user.id || task.assignedToId === user.id;
  }

  protected sort(column: 'title' | 'priority' | 'dueDate' | 'position'): void {
    const current = this.filters();
    if (current.sortBy === column) {
      this.taskStore.setFilters({ sortDirection: current.sortDirection === 'asc' ? 'desc' : 'asc' });
    } else {
      this.taskStore.setFilters({ sortBy: column, sortDirection: 'asc' });
    }
  }

  onDrop(event: CdkDragDrop<ITask[]>): void {
    const draggedTask = event.item.data as ITask;
    if (!this.canDragTask(draggedTask)) return;
    const localTasks = [...this.tasks()];
    moveItemInArray(localTasks, event.previousIndex, event.currentIndex);
    this.tasks.set(localTasks);

    // Update positions for tasks with the same status as the dragged task
    const reorderedTask = localTasks[event.currentIndex];
    const status = reorderedTask.status;
    const sameStatusTasks = localTasks
      .filter((t) => t.status === status)
      .map((t, i) => ({ ...t, position: i }));

    this.taskStore.reorderTasks(sameStatusTasks);
    for (const t of sameStatusTasks) {
      this.taskService.reorderTask(t.id, { status: t.status, position: t.position });
    }
  }
}
