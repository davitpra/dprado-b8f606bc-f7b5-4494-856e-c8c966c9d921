import { Component, inject } from '@angular/core';
import { TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { UIStore } from '../../../core/stores/ui.store';

@Component({
  selector: 'app-task-filters',
  standalone: true,
  imports: [],
  templateUrl: './task-filters.component.html',
})
export class TaskFiltersComponent {
  protected taskStore = inject(TaskStore);
  protected uiStore = inject(UIStore);

  protected statuses = Object.values(TaskStatus);
  protected categories = Object.values(TaskCategory);
  protected priorities = Object.values(TaskPriority);

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.taskStore.setFilters({ search: value });
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.taskStore.setFilters({ status: (value as TaskStatus) || null });
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.taskStore.setFilters({ category: (value as TaskCategory) || null });
  }

  onPriorityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.taskStore.setFilters({ priority: (value as TaskPriority) || null });
  }
}
