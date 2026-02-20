import { computed, Injectable, signal } from '@angular/core';
import { IOrganization } from '@task-management/data';

interface OrganizationState {
  organization: IOrganization | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrganizationStore {
  private readonly _state = signal<OrganizationState>({
    organization: null,
    isLoading: false,
    error: null,
  });

  // Selectors
  readonly organization = computed(() => this._state().organization);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  // Actions
  setOrganization(organization: IOrganization): void {
    this._state.update((s) => ({ ...s, organization, error: null }));
  }

  setLoading(isLoading: boolean): void {
    this._state.update((s) => ({ ...s, isLoading }));
  }

  setError(error: string | null): void {
    this._state.update((s) => ({ ...s, error }));
  }

  reset(): void {
    this._state.set({ organization: null, isLoading: false, error: null });
  }
}
