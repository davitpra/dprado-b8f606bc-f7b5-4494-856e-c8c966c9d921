import { computed, Injectable, signal } from '@angular/core';
import { ITask, TaskCategory, TaskPriority, TaskStatus } from '@task-management/data';

export interface TaskFilters {
  search: string;
  status: TaskStatus | null;
  category: TaskCategory | null;
  priority: TaskPriority | null;
  sortBy: 'dueDate' | 'priority' | 'title' | 'position';
  sortDirection: 'asc' | 'desc';
}

const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  status: null,
  category: null,
  priority: null,
  sortBy: 'position',
  sortDirection: 'asc',
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 0,
  [TaskPriority.MEDIUM]: 1,
  [TaskPriority.LOW]: 2,
};

interface TaskState {
  tasks: ITask[];
  selectedTaskId: string | null;
  filters: TaskFilters;
  isLoading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly _state = signal<TaskState>({
    tasks: [],
    selectedTaskId: null,
    filters: DEFAULT_FILTERS,
    isLoading: false,
    error: null,
  });

  // Selectors
  readonly tasks = computed(() => this._state().tasks);
  readonly filters = computed(() => this._state().filters);
  readonly selectedTaskId = computed(() => this._state().selectedTaskId);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  readonly selectedTask = computed(() => {
    const id = this._state().selectedTaskId;
    return this._state().tasks.find((t) => t.id === id) ?? null;
  });

  readonly filteredTasks = computed(() => {
    let tasks = this._state().tasks;
    const { search, status, category, priority, sortBy, sortDirection } = this._state().filters;

    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q),
      );
    }
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (category) tasks = tasks.filter((t) => t.category === category);
    if (priority) tasks = tasks.filter((t) => t.priority === priority);

    return [...tasks].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'priority':
          return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        case 'dueDate':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'position':
        default: {
          const statusOrder: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
          const sd = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
          return sd !== 0 ? sd : dir * (a.position - b.position);
        }
      }
    });
  });

  /** Tasks grouped by status and sorted by position — used for Kanban view */
  readonly tasksByStatus = computed(() => {
    const tasks = this.filteredTasks();
    const byStatus = (status: TaskStatus) =>
      tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

    return {
      [TaskStatus.TODO]: byStatus(TaskStatus.TODO),
      [TaskStatus.IN_PROGRESS]: byStatus(TaskStatus.IN_PROGRESS),
      [TaskStatus.DONE]: byStatus(TaskStatus.DONE),
    };
  });

  readonly taskCount = computed(() => this._state().tasks.length);
  readonly hasActiveFilters = computed(() => {
    const { search, status, category, priority } = this._state().filters;
    return !!(search || status || category || priority);
  });

  // Actions
  setTasks(tasks: ITask[]): void {
    this._state.update((s) => ({ ...s, tasks, error: null }));
  }

  addTask(task: ITask): void {
    this._state.update((s) => ({ ...s, tasks: [...s.tasks, task] }));
  }

  updateTask(updated: ITask): void {
    this._state.update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === updated.id ? updated : t)),
    }));
  }

  removeTask(id: string): void {
    this._state.update((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
    }));
  }

  reorderTasks(updatedTasks: ITask[]): void {
    this._state.update((s) => {
      const updatedMap = new Map(updatedTasks.map((t) => [t.id, t]));
      return {
        ...s,
        tasks: s.tasks.map((t) => updatedMap.get(t.id) ?? t),
      };
    });
  }

  setSelectedTask(id: string | null): void {
    this._state.update((s) => ({ ...s, selectedTaskId: id }));
  }

  setFilters(filters: Partial<TaskFilters>): void {
    this._state.update((s) => ({ ...s, filters: { ...s.filters, ...filters } }));
  }

  resetFilters(): void {
    this._state.update((s) => ({ ...s, filters: DEFAULT_FILTERS }));
  }

  setLoading(isLoading: boolean): void {
    this._state.update((s) => ({ ...s, isLoading }));
  }

  setError(error: string | null): void {
    this._state.update((s) => ({ ...s, error }));
  }

  reset(): void {
    this._state.set({
      tasks: [],
      selectedTaskId: null,
      filters: DEFAULT_FILTERS,
      isLoading: false,
      error: null,
    });
  }
}
