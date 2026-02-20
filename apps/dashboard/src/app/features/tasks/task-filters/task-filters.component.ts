import { Component, inject } from '@angular/core';
import { TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { UIStore } from '../../../core/stores/ui.store';

@Component({
  selector: 'app-task-filters',
  standalone: true,
  imports: [],
  template: `
    <div class="filters-bar">
      <input
        type="search"
        placeholder="Search tasks…"
        [value]="taskStore.filters().search"
        (input)="onSearch($event)"
        aria-label="Search tasks"
        class="search-input"
      />
      <select
        [value]="taskStore.filters().status ?? ''"
        (change)="onStatusChange($event)"
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
      <select
        [value]="taskStore.filters().category ?? ''"
        (change)="onCategoryChange($event)"
        aria-label="Filter by category"
      >
        <option value="">All Categories</option>
        @for (c of categories; track c) {
          <option [value]="c">{{ c }}</option>
        }
      </select>
      <select
        [value]="taskStore.filters().priority ?? ''"
        (change)="onPriorityChange($event)"
        aria-label="Filter by priority"
      >
        <option value="">All Priorities</option>
        @for (p of priorities; track p) {
          <option [value]="p">{{ p }}</option>
        }
      </select>
      @if (taskStore.hasActiveFilters()) {
        <button class="clear-btn" (click)="taskStore.resetFilters()">Clear</button>
      }
      <div class="view-toggle">
        <button
          (click)="uiStore.setTaskView('kanban')"
          [class.active]="uiStore.taskView() === 'kanban'"
          aria-label="Kanban view"
        >Kanban</button>
        <button
          (click)="uiStore.setTaskView('list')"
          [class.active]="uiStore.taskView() === 'list'"
          aria-label="List view"
        >List</button>
      </div>
    </div>
  `,
  styles: [`
    .filters-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
      align-items: center;
      padding: 0.75rem 1rem;
      background: white;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .search-input { flex: 1; min-width: 160px; }
    input, select {
      padding: 0.4rem 0.625rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    .clear-btn {
      padding: 0.375rem 0.75rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      cursor: pointer;
      color: #6b7280;
    }
    .view-toggle {
      margin-left: auto;
      display: flex;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      overflow: hidden;
    }
    .view-toggle button {
      padding: 0.375rem 0.75rem;
      background: white;
      border: none;
      font-size: 0.75rem;
      cursor: pointer;
      color: #6b7280;
    }
    .view-toggle button.active {
      background: #3b82f6;
      color: white;
    }
  `],
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
