import { Component, inject, output } from '@angular/core';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragPlaceholder, moveItemInArray } from '@angular/cdk/drag-drop';
import { ITask, TaskStatus } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { TaskService } from '../../../core/services/task.service';
import { ToastService } from '../../../core/services/toast.service';
import { TaskCardComponent } from '../task-card/task-card.component';

@Component({
  selector: 'app-task-kanban',
  standalone: true,
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, TaskCardComponent],
  templateUrl: './task-kanban.component.html',
})
export class TaskKanbanComponent {
  editTask = output<ITask>();
  deleteTask = output<ITask>();

  protected taskStore = inject(TaskStore);
  private authStore = inject(AuthStore);
  private departmentStore = inject(DepartmentStore);
  private taskService = inject(TaskService);
  private toastService = inject(ToastService);

  protected columns = [
    { status: TaskStatus.TODO, label: 'To Do' },
    { status: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { status: TaskStatus.DONE, label: 'Done' },
  ];

  private readonly statusLabel: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'To Do',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.DONE]: 'Done',
  };

  protected connectedLists = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];

  protected canDragTask(task: ITask): boolean {
    if (this.authStore.isOwner()) return true;
    const dept = this.departmentStore.currentDepartment();
    if (dept && this.authStore.isAdminInDepartment(dept.id)) return true;
    const user = this.authStore.user();
    return !!user && (task.createdById === user.id || task.assignedToId === user.id);
  }

  async onDrop(event: CdkDragDrop<ITask[]>): Promise<void> {
    const draggedTask = event.item.data as ITask;
    if (!this.canDragTask(draggedTask)) return;

    if (event.previousContainer === event.container) {
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      const updated = items.map((t, i) => ({ ...t, position: i }));
      this.taskStore.reorderTasks(updated);
      for (const t of updated) {
        if (this.canDragTask(t)) {
          this.taskService.reorderTask(t.id, { status: t.status, position: t.position });
        }
      }
    } else {
      const newStatus = event.container.id as TaskStatus;
      const task = event.item.data as ITask;
      const newPosition = event.currentIndex;
      this.taskStore.updateTask({ ...task, status: newStatus, position: newPosition });
      await this.taskService.reorderTask(task.id, { status: newStatus, position: newPosition });
      this.toastService.success(`Task moved to ${this.statusLabel[newStatus]}`);
    }
  }
}
