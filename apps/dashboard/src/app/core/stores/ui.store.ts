import { computed, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
export type TaskView = 'kanban' | 'list';

interface UIState {
  theme: Theme;
  taskView: TaskView;
  isSidebarOpen: boolean;
}

@Injectable({ providedIn: 'root' })
export class UIStore {
  private readonly _state = signal<UIState>({
    theme: (localStorage.getItem('theme') as Theme) ?? 'light',
    taskView: 'kanban',
    isSidebarOpen: true,
  });

  // Selectors
  readonly theme = computed(() => this._state().theme);
  readonly taskView = computed(() => this._state().taskView);
  readonly isSidebarOpen = computed(() => this._state().isSidebarOpen);
  readonly isDarkMode = computed(() => this._state().theme === 'dark');

  // Actions
  toggleTheme(): void {
    this._state.update((s) => {
      const theme: Theme = s.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      return { ...s, theme };
    });
  }

  setTheme(theme: Theme): void {
    localStorage.setItem('theme', theme);
    this._state.update((s) => ({ ...s, theme }));
  }

  setTaskView(taskView: TaskView): void {
    this._state.update((s) => ({ ...s, taskView }));
  }

  toggleSidebar(): void {
    this._state.update((s) => ({ ...s, isSidebarOpen: !s.isSidebarOpen }));
  }

  closeSidebar(): void {
    this._state.update((s) => ({ ...s, isSidebarOpen: false }));
  }

  openSidebar(): void {
    this._state.update((s) => ({ ...s, isSidebarOpen: true }));
  }
}
