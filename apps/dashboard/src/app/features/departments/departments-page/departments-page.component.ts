import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IDepartment } from '@task-management/data';
import { DepartmentStore } from '../../../core/stores/department.store';

@Component({
  selector: 'app-departments-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="departments-page">
      <div class="page-header">
        <h1>Departments</h1>
        <button class="btn-primary" (click)="openForm()">+ New Department</button>
      </div>

      @if (showForm()) {
        <div class="dept-form">
          <h3>{{ editDept() ? 'Edit Department' : 'New Department' }}</h3>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="dept-name">Name *</label>
              <input id="dept-name" formControlName="name" placeholder="Department name" />
            </div>
            <div class="form-group">
              <label for="dept-desc">Description</label>
              <textarea id="dept-desc" formControlName="description" rows="2" placeholder="Optional"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="cancelForm()">Cancel</button>
              <button type="submit" class="btn-submit" [disabled]="form.invalid">
                {{ editDept() ? 'Save' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      }

      <div class="departments-list">
        @for (dept of departmentStore.departments(); track dept.id) {
          <div class="dept-card">
            <div class="dept-info">
              <h3>{{ dept.name }}</h3>
              @if (dept.description) {
                <p>{{ dept.description }}</p>
              }
            </div>
            <div class="dept-actions">
              <a [routerLink]="['/app/departments', dept.id, 'members']" class="link-btn">Members</a>
              <button class="btn-edit" (click)="startEdit(dept)">Edit</button>
              <button class="btn-danger" (click)="deleteDepartment(dept.id)">Delete</button>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <p>No departments yet. Create your first department above.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .departments-page { }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .btn-primary { padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500; }
    .dept-form { background: white; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .dept-form h3 { margin: 0 0 1rem; font-size: 1rem; }
    .form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
    label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
    input, textarea {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    textarea { resize: vertical; }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
    .btn-cancel { padding: 0.375rem 0.75rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0.375rem; cursor: pointer; }
    .btn-submit { padding: 0.375rem 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; }
    .btn-submit:disabled { opacity: 0.6; }
    .departments-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .dept-card { background: white; padding: 1rem 1.5rem; border-radius: 0.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .dept-info h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .dept-info p { margin: 0; color: #6b7280; font-size: 0.875rem; }
    .dept-actions { display: flex; gap: 0.75rem; align-items: center; }
    .link-btn { color: #3b82f6; text-decoration: none; font-size: 0.875rem; }
    .btn-edit { padding: 0.25rem 0.75rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
    .btn-danger { padding: 0.25rem 0.75rem; color: #dc2626; background: #fff5f5; border: 1px solid #fecaca; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
    .empty-state { text-align: center; padding: 2rem; color: #6b7280; background: white; border-radius: 0.5rem; }
  `],
})
export class DepartmentsPageComponent {
  protected departmentStore = inject(DepartmentStore);
  private fb = inject(FormBuilder);

  protected showForm = signal(false);
  protected editDept = signal<IDepartment | null>(null);

  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  openForm(): void {
    this.editDept.set(null);
    this.form.reset({ name: '', description: '' });
    this.showForm.set(true);
  }

  startEdit(dept: IDepartment): void {
    this.editDept.set(dept);
    this.form.patchValue({ name: dept.name, description: dept.description ?? '' });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editDept.set(null);
    this.form.reset();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    // HTTP call wired when DepartmentService is implemented
    this.cancelForm();
  }

  deleteDepartment(id: string): void {
    if (confirm('Delete this department? This action cannot be undone.')) {
      this.departmentStore.removeDepartment(id);
    }
  }
}
