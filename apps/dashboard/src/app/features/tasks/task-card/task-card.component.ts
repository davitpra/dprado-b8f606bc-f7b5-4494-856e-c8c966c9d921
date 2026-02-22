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
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm mb-2 cursor-grab active:cursor-grabbing">
      <div class="flex gap-2 mb-2">
        @switch (task().priority.toLowerCase()) {
          @case ('high') {
            <span class="text-[0.65rem] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">{{ task().priority }}</span>
          }
          @case ('medium') {
            <span class="text-[0.65rem] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{{ task().priority }}</span>
          }
          @case ('low') {
            <span class="text-[0.65rem] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{{ task().priority }}</span>
          }
        }
        <span class="text-[0.65rem] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">{{ task().category }}</span>
      </div>
      <h3 class="m-0 mb-1 text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">{{ task().title }}</h3>
      @if (task().description) {
        <p class="m-0 mb-2 text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">{{ task().description }}</p>
      }
      <div class="flex items-center gap-2 mt-1">
        @if (task().dueDate) {
          <div class="text-xs text-gray-400 dark:text-gray-500">Due: {{ task().dueDate | date:'mediumDate' }}</div>
        }
        @if (assignedUser()) {
          <span class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-auto">
            <ng-icon name="lucideUser" size="11" />{{ assignedUser()!.firstName }}
          </span>
        }
      </div>
      @if (canEdit()) {
        <div class="flex gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            class="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 cursor-pointer border-none bg-transparent"
            aria-label="Edit task"
            (click)="$event.stopPropagation(); onEdit()">
            <ng-icon name="lucidePencil" size="14" />
          </button>
          <button
            class="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 cursor-pointer border-none bg-transparent"
            aria-label="Delete task"
            (click)="$event.stopPropagation(); onDelete()">
            <ng-icon name="lucideTrash2" size="14" />
          </button>
        </div>
      }
    </div>
  `,
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
    return this.task().createdById === user.id;
  });

  onEdit(): void {
    this.edit.emit(this.task());
  }

  onDelete(): void {
    this.delete.emit(this.task());
  }
}
