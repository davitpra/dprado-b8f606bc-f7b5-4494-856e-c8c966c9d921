import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IDepartment, IUser, UserRole } from '@task-management/data';
import { DepartmentStore } from '../stores/department.store';

interface UserRoleResponse {
  id: string;
  userId: string;
  role: UserRole;
  departmentId: string;
  user: IUser;
}

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

  async loadMembers(departmentId: string): Promise<void> {
    this.departmentStore.setLoading(true);
    this.departmentStore.setError(null);

    try {
      const roles = await firstValueFrom(
        this.http.get<UserRoleResponse[]>(`/api/departments/${departmentId}/members`),
      );
      const members = roles.map((ur) => ({
        user: ur.user,
        role: ur.role.toLowerCase() as 'admin' | 'viewer',
      }));
      this.departmentStore.setMembers(members);
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to load members');
      this.departmentStore.setError(message);
    } finally {
      this.departmentStore.setLoading(false);
    }
  }

  async inviteMember(
    departmentId: string,
    data: { userId: string; role: string },
  ): Promise<void> {
    this.departmentStore.setLoading(true);
    this.departmentStore.setError(null);

    try {
      const ur = await firstValueFrom(
        this.http.post<UserRoleResponse>(`/api/departments/${departmentId}/members`, data),
      );
      this.departmentStore.addMember({
        user: ur.user,
        role: ur.role.toLowerCase() as 'admin' | 'viewer',
      });
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to invite member');
      this.departmentStore.setError(message);
      throw err;
    } finally {
      this.departmentStore.setLoading(false);
    }
  }

  async updateMemberRole(
    departmentId: string,
    userId: string,
    role: UserRole.ADMIN | UserRole.VIEWER,
  ): Promise<void> {
    this.departmentStore.setError(null);

    try {
      const ur = await firstValueFrom(
        this.http.put<UserRoleResponse>(`/api/departments/${departmentId}/members/${userId}`, { role }),
      );
      this.departmentStore.updateMember(userId, ur.role.toLowerCase() as 'admin' | 'viewer');
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to update member role');
      this.departmentStore.setError(message);
      throw err;
    }
  }

  async removeMember(departmentId: string, userId: string): Promise<void> {
    this.departmentStore.setLoading(true);
    this.departmentStore.setError(null);

    try {
      await firstValueFrom(
        this.http.delete(`/api/departments/${departmentId}/members/${userId}`),
      );
      this.departmentStore.removeMember(userId);
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to remove member');
      this.departmentStore.setError(message);
      throw err;
    } finally {
      this.departmentStore.setLoading(false);
    }
  }

  async loadOrgUsers(): Promise<IUser[]> {
    const users = await firstValueFrom(
      this.http.get<IUser[]>('/api/organizations/me/users'),
    );
    return users;
  }

  async createOrgUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<IUser> {
    try {
      return await firstValueFrom(
        this.http.post<IUser>('/api/organizations/me/users', data),
      );
    } catch (err: unknown) {
      const message = this.extractError(err, 'Failed to create user');
      this.departmentStore.setError(message);
      throw err;
    }
  }

  private extractError(err: unknown, fallback: string): string {
    return err instanceof Object && 'error' in err
      ? ((err as { error: { message?: string } }).error.message ?? fallback)
      : fallback;
  }
}
