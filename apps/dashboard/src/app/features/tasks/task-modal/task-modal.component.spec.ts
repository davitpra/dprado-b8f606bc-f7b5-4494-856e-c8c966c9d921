import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TaskModalComponent } from './task-modal.component';
import { DepartmentStore } from '../../../core/stores/department.store';
import { createMockDepartmentStore } from '../../../testing/mock-stores';
import { makeTask } from '../../../testing/test-fixtures';
import { TaskStatus, TaskPriority, TaskCategory } from '@task-management/data';

describe('TaskModalComponent', () => {
  let fixture: ComponentFixture<TaskModalComponent>;
  let component: TaskModalComponent;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;

  const createFixture = () => {
    fixture = TestBed.createComponent(TaskModalComponent);
    component = fixture.componentInstance;
  };

  beforeEach(async () => {
    mockDeptStore = createMockDepartmentStore();

    await TestBed.configureTestingModule({
      imports: [TaskModalComponent],
      providers: [
        { provide: DepartmentStore, useValue: mockDeptStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TaskModalComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('create mode (editTask = null)', () => {
    it('form defaults to TODO status, MEDIUM priority, WORK category', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', null);
      component.ngOnInit();
      fixture.detectChanges();

      const raw = component['form'].getRawValue();
      expect(raw.status).toBe(TaskStatus.TODO);
      expect(raw.priority).toBe(TaskPriority.MEDIUM);
      expect(raw.category).toBe(TaskCategory.WORK);
    });

    it('title is required — empty form is invalid', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', null);
      component.ngOnInit();
      fixture.detectChanges();

      expect(component['form'].invalid).toBe(true);
    });

    it('form is valid with a title', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', null);
      component.ngOnInit();
      fixture.detectChanges();

      component['form'].patchValue({ title: 'My Task' });
      expect(component['form'].valid).toBe(true);
    });

    it('onSubmit does NOT emit saved when form is invalid', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', null);
      component.ngOnInit();
      fixture.detectChanges();

      const savedSpy = jest.fn();
      component.saved.subscribe(savedSpy);
      component.onSubmit();
      expect(savedSpy).not.toHaveBeenCalled();
    });

    it('onSubmit emits saved with form values when form is valid', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', null);
      component.ngOnInit();
      fixture.detectChanges();

      const savedSpy = jest.fn();
      component.saved.subscribe(savedSpy);

      component['form'].patchValue({ title: 'New Task' });
      component.onSubmit();

      expect(savedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Task', status: TaskStatus.TODO }),
      );
    });

    it('onSubmit omits dueDate key when field is empty', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', null);
      component.ngOnInit();
      fixture.detectChanges();

      const savedSpy = jest.fn();
      component.saved.subscribe(savedSpy);

      component['form'].patchValue({ title: 'Test', dueDate: '' });
      component.onSubmit();

      expect(savedSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({ dueDate: expect.anything() }),
      );
    });

    it('onClose emits closed', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', null);
      component.ngOnInit();
      fixture.detectChanges();

      const closedSpy = jest.fn();
      component.closed.subscribe(closedSpy);
      component.onClose();
      expect(closedSpy).toHaveBeenCalled();
    });
  });

  describe('edit mode (editTask = someTask)', () => {
    const existingTask = makeTask({
      id: 'task-1',
      title: 'Existing Task',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      category: TaskCategory.PERSONAL,
      dueDate: '2025-12-31',
    });

    it('patches form with existing task values on ngOnInit', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', existingTask);
      component.ngOnInit();
      fixture.detectChanges();

      const raw = component['form'].getRawValue();
      expect(raw.title).toBe('Existing Task');
      expect(raw.status).toBe(TaskStatus.IN_PROGRESS);
      expect(raw.priority).toBe(TaskPriority.HIGH);
      expect(raw.category).toBe(TaskCategory.PERSONAL);
      expect(raw.dueDate).toBe('2025-12-31');
    });

    it('onSubmit emits updated values', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', existingTask);
      component.ngOnInit();
      fixture.detectChanges();

      const savedSpy = jest.fn();
      component.saved.subscribe(savedSpy);

      component['form'].patchValue({ title: 'Updated Title' });
      component.onSubmit();

      expect(savedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Title' }),
      );
    });

    it('onSubmit includes dueDate when set', () => {
      createFixture();
      fixture.componentRef.setInput('editTask', existingTask);
      component.ngOnInit();
      fixture.detectChanges();

      const savedSpy = jest.fn();
      component.saved.subscribe(savedSpy);

      component.onSubmit();

      expect(savedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ dueDate: '2025-12-31' }),
      );
    });
  });
});
