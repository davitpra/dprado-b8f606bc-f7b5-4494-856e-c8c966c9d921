import { Component, inject, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSearch,
  lucideSlidersHorizontal,
  lucideX,
  lucideList,
  lucideLayoutDashboard,
} from '@ng-icons/lucide';
import { TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { UIStore } from '../../../core/stores/ui.store';

@Component({
  selector: 'app-task-filters',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({ lucideSearch, lucideSlidersHorizontal, lucideX, lucideList, lucideLayoutDashboard }),
  ],
  templateUrl: './task-filters.component.html',
})
export class TaskFiltersComponent {
  protected taskStore = inject(TaskStore);
  protected uiStore = inject(UIStore);
  private breakpointObserver = inject(BreakpointObserver);

  protected statuses = Object.values(TaskStatus);
  protected categories = Object.values(TaskCategory);
  protected priorities = Object.values(TaskPriority);

  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 767px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  constructor() {
    effect(() => {
      if (this.isMobile() && this.uiStore.taskView() === 'kanban') {
        this.uiStore.setTaskView('list');
      }
    });
  }

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
