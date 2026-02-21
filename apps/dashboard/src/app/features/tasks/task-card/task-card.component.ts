import { Component, inject, input, computed, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ITask } from '@task-management/data';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [DatePipe],
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
      @if (task().dueDate) {
        <div class="text-xs text-gray-400 dark:text-gray-500 mb-1">Due: {{ task().dueDate | date:'mediumDate' }}</div>
      }
      @if (canEdit()) {
        <div class="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button class="text-xs px-2 py-1 rounded cursor-pointer border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
            (click)="$event.stopPropagation(); onEdit()">Edit</button>
          <button class="text-xs px-2 py-1 rounded cursor-pointer border bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            (click)="$event.stopPropagation(); onDelete()">Delete</button>
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
