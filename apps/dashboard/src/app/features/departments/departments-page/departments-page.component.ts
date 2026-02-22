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
  templateUrl: './departments-page.component.html',
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
