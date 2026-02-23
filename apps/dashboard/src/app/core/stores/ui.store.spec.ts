import { TestBed } from '@angular/core/testing';
import { UIStore } from './ui.store';

describe('UIStore', () => {
  let store: UIStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(UIStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('theme is light when localStorage is empty', () => {
      expect(store.theme()).toBe('light');
    });

    it('isDarkMode is false for light theme', () => {
      expect(store.isDarkMode()).toBe(false);
    });

    it('taskView is list', () => {
      expect(store.taskView()).toBe('list');
    });

    it('isSidebarOpen is true', () => {
      expect(store.isSidebarOpen()).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('switches from light to dark', () => {
      store.toggleTheme();
      expect(store.theme()).toBe('dark');
      expect(store.isDarkMode()).toBe(true);
    });

    it('switches from dark back to light', () => {
      store.toggleTheme();
      store.toggleTheme();
      expect(store.theme()).toBe('light');
      expect(store.isDarkMode()).toBe(false);
    });

    it('persists theme to localStorage', () => {
      store.toggleTheme();
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('sets theme to dark', () => {
      store.setTheme('dark');
      expect(store.theme()).toBe('dark');
      expect(store.isDarkMode()).toBe(true);
    });

    it('persists to localStorage', () => {
      store.setTheme('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('setTaskView', () => {
    it('updates taskView signal', () => {
      store.setTaskView('kanban');
      expect(store.taskView()).toBe('kanban');
    });

    it('can switch back to list', () => {
      store.setTaskView('kanban');
      store.setTaskView('list');
      expect(store.taskView()).toBe('list');
    });
  });

  describe('sidebar', () => {
    it('toggleSidebar toggles isSidebarOpen', () => {
      expect(store.isSidebarOpen()).toBe(true);
      store.toggleSidebar();
      expect(store.isSidebarOpen()).toBe(false);
      store.toggleSidebar();
      expect(store.isSidebarOpen()).toBe(true);
    });

    it('closeSidebar sets isSidebarOpen to false', () => {
      store.closeSidebar();
      expect(store.isSidebarOpen()).toBe(false);
    });

    it('openSidebar sets isSidebarOpen to true', () => {
      store.closeSidebar();
      store.openSidebar();
      expect(store.isSidebarOpen()).toBe(true);
    });
  });
});
