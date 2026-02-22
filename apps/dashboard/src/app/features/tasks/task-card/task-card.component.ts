import { Component, inject, input, computed, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2, lucideUser } from '@ng-icons/lucide';
import { ITask } from '@task-management/data';
import { AuthStore } from '../../../core/stores/auth.store';
import { DepartmentStore } from '../../../core/stores/department.store';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [DatePipe, NgIcon],
  providers: [provideIcons({ lucidePencil, lucideTrash2, lucideUser })],
  templateUrl: './task-card.component.html',
})
export class TaskCardComponent {
  task = input.required<ITask>();
  edit = output<ITask>();
  delete = output<ITask>();

  private authStore = inject(AuthStore);
  private departmentStore = inject(DepartmentStore);

  protected assignedUser = computed(() => {
    const assignedId = this.task().assignedToId;
    if (!assignedId) return null;
    return this.departmentStore.members().find((m) => m.user.id === assignedId)?.user ?? null;
  });

  protected canEdit = computed(() => {
    const user = this.authStore.user();
    if (!user) return false;
    if (this.authStore.isOwner()) return true;
    const deptId = this.task().departmentId;
    if (this.authStore.isAdminInDepartment(deptId)) return true;
    // Viewer can edit/delete their own tasks
    return this.task().createdById === user.id || this.task().assignedToId === user.id;
  });

  onEdit(): void {
    this.edit.emit(this.task());
  }

  onDelete(): void {
    this.delete.emit(this.task());
  }
}
