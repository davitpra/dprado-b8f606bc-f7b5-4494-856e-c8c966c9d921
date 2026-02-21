import { Component, inject, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IDepartment } from '@task-management/data';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentStore } from '../../../core/stores/department.store';

@Component({
  selector: 'app-department-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editDept() ? 'Edit Department' : 'New Department' }}</h2>
          <button class="close-btn" (click)="onClose()" aria-label="Close">&#10005;</button>
        </div>

        @if (departmentStore.error()) {
          <div class="error-banner">{{ departmentStore.error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="dept-name">Name *</label>
            <input id="dept-name" type="text" formControlName="name" placeholder="Department name" />
          </div>
          <div class="form-group">
            <label for="dept-desc">Description</label>
            <textarea
              id="dept-desc"
              formControlName="description"
              rows="3"
              placeholder="Optional description"
            ></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="onClose()">Cancel</button>
            <button
              type="submit"
              class="btn-submit"
              [disabled]="form.invalid || departmentStore.isLoading()"
            >
              {{ editDept() ? 'Save Changes' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal-content {
      background: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      width: 100%;
      max-width: 480px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .modal-header h2 { margin: 0; font-size: 1.125rem; }
    .close-btn { background: none; border: none; font-size: 1rem; cursor: pointer; color: #6b7280; }
    .error-banner {
      background: #fef2f2;
      color: #dc2626;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151; }
    input, textarea {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #3b82f6;
    }
    textarea { resize: vertical; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .btn-cancel {
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
    }
    .btn-submit {
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class DepartmentFormModalComponent implements OnInit {
  editDept = input<IDepartment | null>(null);
  closed = output<void>();

  protected departmentStore = inject(DepartmentStore);
  private departmentService = inject(DepartmentService);
  private fb = inject(FormBuilder);

  protected form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const dept = this.editDept();
    if (dept) {
      this.form.patchValue({
        name: dept.name,
        description: dept.description ?? '',
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const { name, description } = this.form.getRawValue();
    const dept = this.editDept();

    try {
      if (dept) {
        await this.departmentService.updateDepartment(dept.id, {
          name: name!,
          description: description || undefined,
        });
      } else {
        await this.departmentService.createDepartment({
          name: name!,
          description: description || undefined,
        });
      }
      this.closed.emit();
    } catch {
      // Error is displayed via departmentStore.error()
    }
  }

  onClose(): void {
    this.departmentStore.setError(null);
    this.closed.emit();
  }
}
