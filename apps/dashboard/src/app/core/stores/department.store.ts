import { computed, Injectable, signal } from '@angular/core';
import { IDepartment, IUser } from '@task-management/data';

interface DepartmentMember {
  user: IUser;
  role: 'admin' | 'viewer';
}

interface DepartmentState {
  departments: IDepartment[];
  currentDepartmentId: string | null;
  members: DepartmentMember[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class DepartmentStore {
  private readonly _state = signal<DepartmentState>({
    departments: [],
    currentDepartmentId: null,
    members: [],
    isLoading: false,
    error: null,
  });

  // Selectors
  readonly departments = computed(() => this._state().departments);
  readonly currentDepartmentId = computed(() => this._state().currentDepartmentId);
  readonly members = computed(() => this._state().members);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  readonly currentDepartment = computed(() => {
    const id = this._state().currentDepartmentId;
    return this._state().departments.find((d) => d.id === id) ?? null;
  });

  // Actions
  setDepartments(departments: IDepartment[]): void {
    this._state.update((s) => ({ ...s, departments, error: null }));
  }

  setCurrentDepartment(id: string | null): void {
    this._state.update((s) => ({ ...s, currentDepartmentId: id, members: [] }));
  }

  addDepartment(department: IDepartment): void {
    this._state.update((s) => ({
      ...s,
      departments: [...s.departments, department],
    }));
  }

  updateDepartment(updated: IDepartment): void {
    this._state.update((s) => ({
      ...s,
      departments: s.departments.map((d) => (d.id === updated.id ? updated : d)),
    }));
  }

  removeDepartment(id: string): void {
    this._state.update((s) => ({
      ...s,
      departments: s.departments.filter((d) => d.id !== id),
      currentDepartmentId: s.currentDepartmentId === id ? null : s.currentDepartmentId,
    }));
  }

  setMembers(members: DepartmentMember[]): void {
    this._state.update((s) => ({ ...s, members }));
  }

  addMember(member: DepartmentMember): void {
    this._state.update((s) => ({ ...s, members: [...s.members, member] }));
  }

  removeMember(userId: string): void {
    this._state.update((s) => ({
      ...s,
      members: s.members.filter((m) => m.user.id !== userId),
    }));
  }

  setLoading(isLoading: boolean): void {
    this._state.update((s) => ({ ...s, isLoading }));
  }

  setError(error: string | null): void {
    this._state.update((s) => ({ ...s, error }));
  }

  reset(): void {
    this._state.set({
      departments: [],
      currentDepartmentId: null,
      members: [],
      isLoading: false,
      error: null,
    });
  }
}
