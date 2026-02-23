import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { TaskFiltersComponent } from './task-filters.component';
import { TaskStore } from '../../../core/stores/task.store';
import { UIStore } from '../../../core/stores/ui.store';
import { createMockTaskStore, createMockUIStore } from '../../../testing/mock-stores';
import { TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';

describe('TaskFiltersComponent', () => {
  let fixture: ComponentFixture<TaskFiltersComponent>;
  let component: TaskFiltersComponent;
  let mockTaskStore: ReturnType<typeof createMockTaskStore>;
  let mockUIStore: ReturnType<typeof createMockUIStore>;
  let mockBreakpointObserver: { observe: jest.Mock };

  const createFixture = () => {
    fixture = TestBed.createComponent(TaskFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockTaskStore = createMockTaskStore();
    mockUIStore = createMockUIStore();
    mockBreakpointObserver = {
      observe: jest.fn().mockReturnValue(of({ matches: false, breakpoints: {} })),
    };

    await TestBed.configureTestingModule({
      imports: [TaskFiltersComponent],
      providers: [
        { provide: TaskStore, useValue: mockTaskStore },
        { provide: UIStore, useValue: mockUIStore },
        { provide: BreakpointObserver, useValue: mockBreakpointObserver },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TaskFiltersComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('onSearch()', () => {
    it('calls taskStore.setFilters with search value', () => {
      createFixture();
      const event = { target: { value: 'hello' } } as unknown as Event;
      component.onSearch(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ search: 'hello' });
    });

    it('calls setFilters with empty string', () => {
      createFixture();
      const event = { target: { value: '' } } as unknown as Event;
      component.onSearch(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ search: '' });
    });
  });

  describe('onStatusChange()', () => {
    it('calls taskStore.setFilters with selected status', () => {
      createFixture();
      const event = { target: { value: TaskStatus.TODO } } as unknown as Event;
      component.onStatusChange(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ status: TaskStatus.TODO });
    });

    it('calls setFilters with null when empty value', () => {
      createFixture();
      const event = { target: { value: '' } } as unknown as Event;
      component.onStatusChange(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ status: null });
    });
  });

  describe('onCategoryChange()', () => {
    it('calls taskStore.setFilters with selected category', () => {
      createFixture();
      const event = { target: { value: TaskCategory.WORK } } as unknown as Event;
      component.onCategoryChange(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ category: TaskCategory.WORK });
    });

    it('calls setFilters with null when empty value', () => {
      createFixture();
      const event = { target: { value: '' } } as unknown as Event;
      component.onCategoryChange(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ category: null });
    });
  });

  describe('onPriorityChange()', () => {
    it('calls taskStore.setFilters with selected priority', () => {
      createFixture();
      const event = { target: { value: TaskPriority.HIGH } } as unknown as Event;
      component.onPriorityChange(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ priority: TaskPriority.HIGH });
    });

    it('calls setFilters with null when empty value', () => {
      createFixture();
      const event = { target: { value: '' } } as unknown as Event;
      component.onPriorityChange(event);
      expect(mockTaskStore.setFilters).toHaveBeenCalledWith({ priority: null });
    });
  });

  describe('enum values', () => {
    it('statuses contains all TaskStatus values', () => {
      createFixture();
      expect(component['statuses']).toEqual(Object.values(TaskStatus));
    });

    it('categories contains all TaskCategory values', () => {
      createFixture();
      expect(component['categories']).toEqual(Object.values(TaskCategory));
    });

    it('priorities contains all TaskPriority values', () => {
      createFixture();
      expect(component['priorities']).toEqual(Object.values(TaskPriority));
    });
  });
});
