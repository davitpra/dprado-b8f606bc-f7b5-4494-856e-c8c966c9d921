import { Component, inject, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IDepartment } from '@task-management/data';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentStore } from '../../../core/stores/department.store';

@Component({
  selector: 'app-department-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './department-form-modal.component.html',
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
