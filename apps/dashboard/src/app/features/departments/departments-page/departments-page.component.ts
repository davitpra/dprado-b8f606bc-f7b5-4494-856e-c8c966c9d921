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
    <div>
      <div class="flex justify-between items-center mb-6">
        <h1 class="m-0 text-2xl font-bold text-gray-900 dark:text-gray-100">Departments</h1>
        <button class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-md cursor-pointer font-medium"
          (click)="openModal()">
          <ng-icon name="lucidePlus" size="16" />
          New Department
        </button>
      </div>

      @if (departmentStore.isLoading() && !departmentStore.departments().length) {
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">Loading departments...</div>
      }

      @if (departmentStore.error() && !showModal()) {
        <div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm mb-4">
          {{ departmentStore.error() }}
        </div>
      }

      <div class="flex flex-col gap-3">
        @for (dept of departmentStore.departments(); track dept.id) {
          <div class="bg-white dark:bg-gray-800 px-6 py-4 rounded-lg flex justify-between items-center shadow-sm">
            <div>
              <div class="flex items-center gap-2 mb-1 text-gray-700 dark:text-gray-200">
                <ng-icon name="lucideBuilding2" size="18" />
                <h3 class="m-0 text-base">{{ dept.name }}</h3>
              </div>
              @if (dept.description) {
                <p class="m-0 mb-1 text-gray-500 dark:text-gray-400 text-sm">{{ dept.description }}</p>
              }
              <span class="text-gray-400 dark:text-gray-500 text-xs">Created {{ dept.createdAt | date:'mediumDate' }}</span>
            </div>
            <div class="flex gap-2 items-center">
              <a [routerLink]="['/app/departments', dept.id, 'members']"
                 class="text-blue-500 no-underline text-sm px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">Members</a>
              <button class="inline-flex items-center justify-center p-1.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                (click)="openModal(dept)" title="Edit">
                <ng-icon name="lucideEdit2" size="16" />
              </button>
              <button class="inline-flex items-center justify-center p-1.5 bg-transparent border border-red-200 dark:border-red-800 rounded-md cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                (click)="confirmDelete(dept)" title="Delete">
                <ng-icon name="lucideTrash2" size="16" />
              </button>
            </div>
          </div>
        } @empty {
          @if (!departmentStore.isLoading()) {
            <div class="text-center py-12 px-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">
              <ng-icon name="lucideBuilding2" size="40" class="mb-3" />
              <p class="m-0 mb-1 font-medium text-base text-gray-700 dark:text-gray-200">No departments yet</p>
              <span class="text-sm">Create your first department to get started.</span>
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
