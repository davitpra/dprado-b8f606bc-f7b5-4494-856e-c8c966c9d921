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
import { lucideGripVertical, lucidePencil, lucideTrash2, lucideUser } from '@ng-icons/lucide';
import { ITask } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [DatePipe, CdkDropList, CdkDrag, CdkDragHandle, NgIcon],
  providers: [provideIcons({ lucideGripVertical, lucidePencil, lucideTrash2, lucideUser })],
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

  getAssignedUser(task: ITask) {
    if (!task.assignedToId) return null;
    return this.departmentStore.members().find((m) => m.user.id === task.assignedToId)?.user ?? null;
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
