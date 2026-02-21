import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IDepartment } from '@task-management/data';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideEdit2,
  lucideTrash2,
  lucideBuilding2,
} from '@ng-icons/lucide';
import { DepartmentStore } from '../../../core/stores/department.store';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentFormModalComponent } from '../department-form-modal/department-form-modal.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-departments-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    NgIcon,
    DepartmentFormModalComponent,
    ConfirmDialogComponent,
  ],
  providers: [
    provideIcons({ lucidePlus, lucideEdit2, lucideTrash2, lucideBuilding2 }),
  ],
  template: `
    <div class="departments-page">
      <div class="page-header">
        <h1>Departments</h1>
        <button class="btn-primary" (click)="openModal()">
          <ng-icon name="lucidePlus" size="16" />
          New Department
        </button>
      </div>

      @if (departmentStore.isLoading() && !departmentStore.departments().length) {
        <div class="loading-state">Loading departments...</div>
      }

      @if (departmentStore.error() && !showModal()) {
        <div class="error-banner">{{ departmentStore.error() }}</div>
      }

      <div class="departments-list">
        @for (dept of departmentStore.departments(); track dept.id) {
          <div class="dept-card">
            <div class="dept-info">
              <div class="dept-title">
                <ng-icon name="lucideBuilding2" size="18" />
                <h3>{{ dept.name }}</h3>
              </div>
              @if (dept.description) {
                <p class="dept-desc">{{ dept.description }}</p>
              }
              <span class="dept-date">Created {{ dept.createdAt | date:'mediumDate' }}</span>
            </div>
            <div class="dept-actions">
              <a [routerLink]="['/app/departments', dept.id, 'members']" class="link-btn">Members</a>
              <button class="btn-icon" (click)="openModal(dept)" title="Edit">
                <ng-icon name="lucideEdit2" size="16" />
              </button>
              <button class="btn-icon btn-icon-danger" (click)="confirmDelete(dept)" title="Delete">
                <ng-icon name="lucideTrash2" size="16" />
              </button>
            </div>
          </div>
        } @empty {
          @if (!departmentStore.isLoading()) {
            <div class="empty-state">
              <ng-icon name="lucideBuilding2" size="40" />
              <p>No departments yet</p>
              <span>Create your first department to get started.</span>
            </div>
          }
        }
      </div>
    </div>

    @if (showModal()) {
      <app-department-form-modal
        [editDept]="editingDept()"
        (closed)="closeModal()"
      />
    }

    @if (showConfirmDialog()) {
      <app-confirm-dialog
        title="Delete Department"
        [message]="'Are you sure you want to delete \\'' + deletingDept()!.name + '\\'? This action cannot be undone.'"
        confirmLabel="Delete"
        (confirmed)="onDeleteConfirmed()"
        (cancelled)="cancelDelete()"
      />
    }
  `,
  styles: [`
    .departments-page { }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-primary:hover { background: #2563eb; }
    .loading-state {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }
    .error-banner {
      background: #fef2f2;
      color: #dc2626;
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .departments-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .dept-card {
      background: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .dept-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
      color: #374151;
    }
    .dept-title h3 { margin: 0; font-size: 1rem; }
    .dept-desc { margin: 0 0 0.25rem; color: #6b7280; font-size: 0.875rem; }
    .dept-date { color: #9ca3af; font-size: 0.75rem; }
    .dept-actions { display: flex; gap: 0.5rem; align-items: center; }
    .link-btn {
      color: #3b82f6;
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
    }
    .link-btn:hover { background: #eff6ff; }
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.375rem;
      background: none;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
      color: #6b7280;
    }
    .btn-icon:hover { background: #f3f4f6; color: #374151; }
    .btn-icon-danger { color: #dc2626; border-color: #fecaca; }
    .btn-icon-danger:hover { background: #fef2f2; color: #dc2626; }
    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      color: #6b7280;
      background: white;
      border-radius: 0.5rem;
    }
    .empty-state ng-icon { margin-bottom: 0.75rem; }
    .empty-state p { margin: 0 0 0.25rem; font-weight: 500; font-size: 1rem; color: #374151; }
    .empty-state span { font-size: 0.875rem; }
  `],
})
export class DepartmentsPageComponent implements OnInit {
  protected departmentStore = inject(DepartmentStore);
  private departmentService = inject(DepartmentService);

  protected showModal = signal(false);
  protected editingDept = signal<IDepartment | null>(null);

  protected showConfirmDialog = signal(false);
  protected deletingDept = signal<IDepartment | null>(null);

  ngOnInit(): void {
    this.departmentService.loadDepartments();
  }

  openModal(dept?: IDepartment): void {
    this.editingDept.set(dept ?? null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingDept.set(null);
  }

  confirmDelete(dept: IDepartment): void {
    this.deletingDept.set(dept);
    this.showConfirmDialog.set(true);
  }

  cancelDelete(): void {
    this.showConfirmDialog.set(false);
    this.deletingDept.set(null);
  }

  async onDeleteConfirmed(): Promise<void> {
    const dept = this.deletingDept();
    if (!dept) return;

    this.showConfirmDialog.set(false);
    this.deletingDept.set(null);

    try {
      await this.departmentService.deleteDepartment(dept.id);
    } catch {
      // Error is displayed via departmentStore.error()
    }
  }
}
