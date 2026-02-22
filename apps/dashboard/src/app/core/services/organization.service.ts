import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IOrganization } from '@task-management/data';
import { OrganizationStore } from '../stores/organization.store';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private http = inject(HttpClient);
  private orgStore = inject(OrganizationStore);

  async loadOrganization(): Promise<void> {
    this.orgStore.setLoading(true);
    try {
      const org = await firstValueFrom(
        this.http.get<IOrganization>('/api/organizations/me'),
      );
      this.orgStore.setOrganization(org);
    } catch (err) {
      this.orgStore.setError('Failed to load organization');
    } finally {
      this.orgStore.setLoading(false);
    }
  }
}
