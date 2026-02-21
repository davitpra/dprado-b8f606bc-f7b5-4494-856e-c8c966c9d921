import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IDepartment } from '@task-management/data';
import { DepartmentStore } from '../stores/department.store';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);
  private departmentStore = inject(DepartmentStore);

  async loadDepartments(): Promise<void> {
    this.departmentStore.setLoading(true);
    this.departmentStore.setError(null);

    try {
      const departments = await firstValueFrom(
        this.http.get<IDepartment[]>('/api/departments'),
      );
      this.departmentStore.setDepartments(departments);
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to load departments');
      this.departmentStore.setError(message);
    } finally {
      this.departmentStore.setLoading(false);
    }
  }

  async createDepartment(data: {
    name: string;
    description?: string;
  }): Promise<IDepartment> {
    this.departmentStore.setLoading(true);
    this.departmentStore.setError(null);

    try {
      const department = await firstValueFrom(
        this.http.post<IDepartment>('/api/departments', data),
      );
      this.departmentStore.addDepartment(department);
      return department;
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to create department');
      this.departmentStore.setError(message);
      throw err;
    } finally {
      this.departmentStore.setLoading(false);
    }
  }

  async updateDepartment(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<IDepartment> {
    this.departmentStore.setLoading(true);
    this.departmentStore.setError(null);

    try {
      const department = await firstValueFrom(
        this.http.put<IDepartment>(`/api/departments/${id}`, data),
      );
      this.departmentStore.updateDepartment(department);
      return department;
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to update department');
      this.departmentStore.setError(message);
      throw err;
    } finally {
      this.departmentStore.setLoading(false);
    }
  }

  async deleteDepartment(id: string): Promise<void> {
    this.departmentStore.setLoading(true);
    this.departmentStore.setError(null);

    try {
      await firstValueFrom(
        this.http.delete(`/api/departments/${id}`),
      );
      this.departmentStore.removeDepartment(id);
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to delete department');
      this.departmentStore.setError(message);
      throw err;
    } finally {
      this.departmentStore.setLoading(false);
    }
  }

  private extractError(err: unknown, fallback: string): string {
    return err instanceof Object && 'error' in err
      ? ((err as { error: { message?: string } }).error.message ?? fallback)
      : fallback;
  }
}
