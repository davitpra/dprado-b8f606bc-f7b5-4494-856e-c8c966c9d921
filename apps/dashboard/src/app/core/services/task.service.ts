import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ITask } from '@task-management/data';
import { TaskStore } from '../stores/task.store';
import { ToastService } from './toast.service';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private taskStore = inject(TaskStore);
  private toastService = inject(ToastService);

  async loadTasks(departmentId?: string | null): Promise<void> {
    this.taskStore.setLoading(true);
    this.taskStore.setError(null);

    try {
      let params = new HttpParams().set('limit', '100');
      if (departmentId) {
        params = params.set('departmentId', departmentId);
      }
      const response = await firstValueFrom(
        this.http.get<PaginatedResponse<ITask>>('/api/tasks', { params }),
      );
      this.taskStore.setTasks(response.items);
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to load tasks');
      this.taskStore.setError(message);
    } finally {
      this.taskStore.setLoading(false);
    }
  }

  async createTask(data: Partial<ITask>): Promise<ITask> {
    this.taskStore.setLoading(true);
    this.taskStore.setError(null);

    try {
      const task = await firstValueFrom(
        this.http.post<ITask>('/api/tasks', data),
      );
      this.taskStore.addTask(task);
      this.toastService.success('Task created');
      return task;
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to create task');
      this.taskStore.setError(message);
      this.toastService.error(message);
      throw err;
    } finally {
      this.taskStore.setLoading(false);
    }
  }

  async updateTask(id: string, data: Partial<ITask>): Promise<ITask> {
    this.taskStore.setLoading(true);
    this.taskStore.setError(null);

    try {
      const task = await firstValueFrom(
        this.http.put<ITask>(`/api/tasks/${id}`, data),
      );
      this.taskStore.updateTask(task);
      this.toastService.success('Task updated');
      return task;
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to update task');
      this.taskStore.setError(message);
      this.toastService.error(message);
      throw err;
    } finally {
      this.taskStore.setLoading(false);
    }
  }

  async deleteTask(id: string): Promise<void> {
    this.taskStore.setLoading(true);
    this.taskStore.setError(null);

    try {
      await firstValueFrom(
        this.http.delete(`/api/tasks/${id}`),
      );
      this.taskStore.removeTask(id);
      this.toastService.success('Task deleted');
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to delete task');
      this.taskStore.setError(message);
      this.toastService.error(message);
      throw err;
    } finally {
      this.taskStore.setLoading(false);
    }
  }

  async reorderTask(
    id: string,
    data: { status: string; position: number },
  ): Promise<ITask> {
    this.taskStore.setError(null);

    try {
      const task = await firstValueFrom(
        this.http.patch<ITask>(`/api/tasks/${id}/reorder`, data),
      );
      this.taskStore.updateTask(task);
      return task;
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to reorder task');
      this.taskStore.setError(message);
      this.toastService.error(message);
      throw err;
    }
  }

  private extractError(err: unknown, fallback: string): string {
    return err instanceof Object && 'error' in err
      ? ((err as { error: { message?: string } }).error.message ?? fallback)
      : fallback;
  }
}
