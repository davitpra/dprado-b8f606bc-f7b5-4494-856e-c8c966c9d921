import { TestBed } from '@angular/core/testing';
import { TaskStore } from './task.store';
import { TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';
import { makeTask } from '../../testing/test-fixtures';

describe('TaskStore', () => {
  let store: TaskStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(TaskStore);
  });

  describe('initial state', () => {
    it('tasks is empty', () => {
      expect(store.tasks()).toEqual([]);
    });

    it('isLoading is false', () => {
      expect(store.isLoading()).toBe(false);
    });

    it('hasActiveFilters is false', () => {
      expect(store.hasActiveFilters()).toBe(false);
    });

    it('filteredTasks is empty', () => {
      expect(store.filteredTasks()).toEqual([]);
    });
  });

  describe('setTasks / addTask / updateTask / removeTask', () => {
    it('setTasks replaces all tasks', () => {
      const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
      store.setTasks(tasks);
      expect(store.tasks()).toHaveLength(2);
    });

    it('addTask appends a task', () => {
      store.setTasks([makeTask({ id: 't1' })]);
      store.addTask(makeTask({ id: 't2' }));
      expect(store.tasks()).toHaveLength(2);
    });

    it('updateTask replaces matching task', () => {
      store.setTasks([makeTask({ id: 't1', title: 'Old' })]);
      store.updateTask(makeTask({ id: 't1', title: 'New' }));
      expect(store.tasks()[0].title).toBe('New');
    });

    it('removeTask removes matching task', () => {
      store.setTasks([makeTask({ id: 't1' }), makeTask({ id: 't2' })]);
      store.removeTask('t1');
      expect(store.tasks()).toHaveLength(1);
      expect(store.tasks()[0].id).toBe('t2');
    });

    it('removeTask clears selectedTaskId if it matches', () => {
      store.setTasks([makeTask({ id: 't1' })]);
      store.setSelectedTask('t1');
      expect(store.selectedTaskId()).toBe('t1');
      store.removeTask('t1');
      expect(store.selectedTaskId()).toBeNull();
    });

    it('removeTask does not clear selectedTaskId if it does not match', () => {
      store.setTasks([makeTask({ id: 't1' }), makeTask({ id: 't2' })]);
      store.setSelectedTask('t2');
      store.removeTask('t1');
      expect(store.selectedTaskId()).toBe('t2');
    });
  });

  describe('filteredTasks — search', () => {
    beforeEach(() => {
      store.setTasks([
        makeTask({ id: 't1', title: 'Fix Login Bug', description: 'Password issue' }),
        makeTask({ id: 't2', title: 'New Feature', description: undefined }),
        makeTask({ id: 't3', title: 'Update Docs', description: 'password reset docs' }),
      ]);
    });

    it('returns all tasks when search is empty', () => {
      expect(store.filteredTasks()).toHaveLength(3);
    });

    it('filters by title (case-insensitive)', () => {
      store.setFilters({ search: 'login' });
      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0].id).toBe('t1');
    });

    it('filters by description (case-insensitive)', () => {
      store.setFilters({ search: 'password' });
      expect(store.filteredTasks()).toHaveLength(2);
    });

    it('returns empty when no match', () => {
      store.setFilters({ search: 'zzznomatch' });
      expect(store.filteredTasks()).toHaveLength(0);
    });
  });

  describe('filteredTasks — status/category/priority filters', () => {
    beforeEach(() => {
      store.setTasks([
        makeTask({ id: 't1', status: TaskStatus.TODO, category: TaskCategory.WORK, priority: TaskPriority.HIGH }),
        makeTask({ id: 't2', status: TaskStatus.IN_PROGRESS, category: TaskCategory.PERSONAL, priority: TaskPriority.LOW }),
        makeTask({ id: 't3', status: TaskStatus.DONE, category: TaskCategory.WORK, priority: TaskPriority.MEDIUM }),
      ]);
    });

    it('filters by status', () => {
      store.setFilters({ status: TaskStatus.TODO });
      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0].id).toBe('t1');
    });

    it('filters by category', () => {
      store.setFilters({ category: TaskCategory.PERSONAL });
      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0].id).toBe('t2');
    });

    it('filters by priority', () => {
      store.setFilters({ priority: TaskPriority.HIGH });
      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0].id).toBe('t1');
    });
  });

  describe('filteredTasks — sorting', () => {
    beforeEach(() => {
      store.setTasks([
        makeTask({ id: 't1', title: 'Zebra', priority: TaskPriority.LOW, position: 2, status: TaskStatus.TODO }),
        makeTask({ id: 't2', title: 'Apple', priority: TaskPriority.HIGH, position: 0, status: TaskStatus.TODO }),
        makeTask({ id: 't3', title: 'Mango', priority: TaskPriority.MEDIUM, position: 1, status: TaskStatus.TODO }),
      ]);
    });

    it('sorts by title asc', () => {
      store.setFilters({ sortBy: 'title', sortDirection: 'asc' });
      const titles = store.filteredTasks().map((t) => t.title);
      expect(titles).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('sorts by title desc', () => {
      store.setFilters({ sortBy: 'title', sortDirection: 'desc' });
      const titles = store.filteredTasks().map((t) => t.title);
      expect(titles).toEqual(['Zebra', 'Mango', 'Apple']);
    });

    it('sorts by priority asc (HIGH first)', () => {
      store.setFilters({ sortBy: 'priority', sortDirection: 'asc' });
      const priorities = store.filteredTasks().map((t) => t.priority);
      expect(priorities).toEqual([TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW]);
    });

    it('sorts by priority desc (LOW first)', () => {
      store.setFilters({ sortBy: 'priority', sortDirection: 'desc' });
      const priorities = store.filteredTasks().map((t) => t.priority);
      expect(priorities).toEqual([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]);
    });

    it('sorts by position asc (default)', () => {
      const ids = store.filteredTasks().map((t) => t.id);
      expect(ids).toEqual(['t2', 't3', 't1']);
    });
  });

  describe('filteredTasks — position sorting groups by status then position', () => {
    it('groups by status order: TODO → IN_PROGRESS → DONE', () => {
      store.setTasks([
        makeTask({ id: 'done1', status: TaskStatus.DONE, position: 0 }),
        makeTask({ id: 'todo1', status: TaskStatus.TODO, position: 0 }),
        makeTask({ id: 'prog1', status: TaskStatus.IN_PROGRESS, position: 0 }),
      ]);
      const ids = store.filteredTasks().map((t) => t.id);
      expect(ids).toEqual(['todo1', 'prog1', 'done1']);
    });
  });

  describe('tasksByStatus', () => {
    it('groups tasks by status', () => {
      store.setTasks([
        makeTask({ id: 't1', status: TaskStatus.TODO }),
        makeTask({ id: 't2', status: TaskStatus.IN_PROGRESS }),
        makeTask({ id: 't3', status: TaskStatus.TODO }),
      ]);
      const byStatus = store.tasksByStatus();
      expect(byStatus[TaskStatus.TODO]).toHaveLength(2);
      expect(byStatus[TaskStatus.IN_PROGRESS]).toHaveLength(1);
      expect(byStatus[TaskStatus.DONE]).toHaveLength(0);
    });

    it('sorts by position within each status group', () => {
      store.setTasks([
        makeTask({ id: 't1', status: TaskStatus.TODO, position: 1 }),
        makeTask({ id: 't2', status: TaskStatus.TODO, position: 0 }),
      ]);
      const todos = store.tasksByStatus()[TaskStatus.TODO];
      expect(todos[0].id).toBe('t2');
      expect(todos[1].id).toBe('t1');
    });
  });

  describe('hasActiveFilters', () => {
    it('is false when no filters set', () => {
      expect(store.hasActiveFilters()).toBe(false);
    });

    it('is true when search is set', () => {
      store.setFilters({ search: 'something' });
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('is true when status is set', () => {
      store.setFilters({ status: TaskStatus.TODO });
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('is true when category is set', () => {
      store.setFilters({ category: TaskCategory.WORK });
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('is true when priority is set', () => {
      store.setFilters({ priority: TaskPriority.HIGH });
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('is false after resetFilters', () => {
      store.setFilters({ search: 'test', status: TaskStatus.TODO });
      store.resetFilters();
      expect(store.hasActiveFilters()).toBe(false);
    });
  });

  describe('setFilters', () => {
    it('merges partial filter updates', () => {
      store.setFilters({ search: 'test' });
      store.setFilters({ sortBy: 'title' });
      expect(store.filters().search).toBe('test');
      expect(store.filters().sortBy).toBe('title');
    });
  });
});
