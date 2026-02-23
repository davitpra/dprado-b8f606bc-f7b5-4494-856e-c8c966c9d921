import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { TaskStore } from '../stores/task.store';
import { ToastService } from './toast.service';
import { makeTask } from '../../testing/test-fixtures';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;
  let mockTaskStore: jest.Mocked<Pick<TaskStore, 'setLoading' | 'setError' | 'setTasks' | 'addTask' | 'updateTask' | 'removeTask' | 'reorderTasks'>>;
  let mockToastService: { success: jest.Mock; error: jest.Mock; warning: jest.Mock };

  beforeEach(() => {
    mockTaskStore = {
      setLoading: jest.fn(),
      setError: jest.fn(),
      setTasks: jest.fn(),
      addTask: jest.fn(),
      updateTask: jest.fn(),
      removeTask: jest.fn(),
      reorderTasks: jest.fn(),
    };
    mockToastService = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TaskStore, useValue: mockTaskStore },
        { provide: ToastService, useValue: mockToastService },
      ],
    });

    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadTasks()', () => {
    it('GETs /api/tasks and calls taskStore.setTasks', async () => {
      const tasks = [makeTask({ id: 't1' })];
      const loadPromise = service.loadTasks();

      const req = httpMock.expectOne((r) => r.url === '/api/tasks');
      expect(req.request.method).toBe('GET');
      req.flush({ items: tasks, total: 1, page: 1, limit: 100, totalPages: 1 });
      await loadPromise;

      expect(mockTaskStore.setTasks).toHaveBeenCalledWith(tasks);
    });

    it('calls taskStore.setError on failure', async () => {
      const loadPromise = service.loadTasks();
      httpMock.expectOne((r) => r.url === '/api/tasks').flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );
      await loadPromise;
      expect(mockTaskStore.setError).toHaveBeenCalled();
    });

    it('passes departmentId as query param when provided', async () => {
      const loadPromise = service.loadTasks('dept-1');
      const req = httpMock.expectOne((r) => r.url === '/api/tasks' && r.params.get('departmentId') === 'dept-1');
      req.flush({ items: [], total: 0, page: 1, limit: 100, totalPages: 0 });
      await loadPromise;
      expect(req).toBeTruthy();
    });
  });

  describe('createTask()', () => {
    it('POSTs to /api/tasks and calls taskStore.addTask', async () => {
      const newTask = makeTask();
      const createPromise = service.createTask({ title: 'New Task', departmentId: 'dept-1' });

      const req = httpMock.expectOne('/api/tasks');
      expect(req.request.method).toBe('POST');
      req.flush(newTask);
      await createPromise;

      expect(mockTaskStore.addTask).toHaveBeenCalledWith(newTask);
    });

    it('calls toastService.success("Task created") on success', async () => {
      const createPromise = service.createTask({ title: 'New Task' });
      httpMock.expectOne('/api/tasks').flush(makeTask());
      await createPromise;
      expect(mockToastService.success).toHaveBeenCalledWith('Task created');
    });

    it('calls toastService.error and rethrows on failure', async () => {
      const createPromise = service.createTask({ title: 'Bad' });
      httpMock.expectOne('/api/tasks').flush(
        { message: 'Validation failed' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(createPromise).rejects.toBeTruthy();
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('updateTask()', () => {
    it('PUTs to /api/tasks/:id and calls taskStore.updateTask', async () => {
      const updated = makeTask({ id: 't1', title: 'Updated' });
      const updatePromise = service.updateTask('t1', { title: 'Updated' });

      const req = httpMock.expectOne('/api/tasks/t1');
      expect(req.request.method).toBe('PUT');
      req.flush(updated);
      await updatePromise;

      expect(mockTaskStore.updateTask).toHaveBeenCalledWith(updated);
    });

    it('calls toastService.success("Task updated") on success', async () => {
      const updatePromise = service.updateTask('t1', {});
      httpMock.expectOne('/api/tasks/t1').flush(makeTask({ id: 't1' }));
      await updatePromise;
      expect(mockToastService.success).toHaveBeenCalledWith('Task updated');
    });

    it('calls toastService.error on failure', async () => {
      const updatePromise = service.updateTask('t1', {});
      httpMock.expectOne('/api/tasks/t1').flush(
        { message: 'Not found' },
        { status: 404, statusText: 'Not Found' },
      );
      await expect(updatePromise).rejects.toBeTruthy();
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('deleteTask()', () => {
    it('DELETEs /api/tasks/:id and calls taskStore.removeTask', async () => {
      const deletePromise = service.deleteTask('t1');

      const req = httpMock.expectOne('/api/tasks/t1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      await deletePromise;

      expect(mockTaskStore.removeTask).toHaveBeenCalledWith('t1');
    });

    it('calls toastService.success("Task deleted") on success', async () => {
      const deletePromise = service.deleteTask('t1');
      httpMock.expectOne('/api/tasks/t1').flush(null);
      await deletePromise;
      expect(mockToastService.success).toHaveBeenCalledWith('Task deleted');
    });

    it('calls toastService.error and rethrows on failure', async () => {
      const deletePromise = service.deleteTask('t1');
      httpMock.expectOne('/api/tasks/t1').flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(deletePromise).rejects.toBeTruthy();
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('reorderTask()', () => {
    it('PATCHes /api/tasks/:id/reorder and calls taskStore.updateTask', async () => {
      const reordered = makeTask({ id: 't1', position: 2 });
      const reorderPromise = service.reorderTask('t1', { status: 'TODO', position: 2 });

      const req = httpMock.expectOne('/api/tasks/t1/reorder');
      expect(req.request.method).toBe('PATCH');
      req.flush(reordered);
      await reorderPromise;

      expect(mockTaskStore.updateTask).toHaveBeenCalledWith(reordered);
    });

    it('calls toastService.error on failure', async () => {
      const reorderPromise = service.reorderTask('t1', { status: 'TODO', position: 0 });
      httpMock.expectOne('/api/tasks/t1/reorder').flush(
        { message: 'Error' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      await expect(reorderPromise).rejects.toBeTruthy();
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });
});
