import { Component, inject, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ITask, TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-modal.component.html',
})
export class TaskModalComponent implements OnInit {
  editTask = input<ITask | null>(null);
  closed = output<void>();
  saved = output<Record<string, unknown>>();

  private fb = inject(FormBuilder);

  protected statuses = Object.values(TaskStatus);
  protected priorities = Object.values(TaskPriority);
  protected categories = Object.values(TaskCategory);

  protected form = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    status: [TaskStatus.TODO, Validators.required],
    priority: [TaskPriority.MEDIUM, Validators.required],
    category: [TaskCategory.WORK, Validators.required],
    dueDate: [''],
  });

  ngOnInit(): void {
    const task = this.editTask();
    if (task) {
      this.form.patchValue({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        category: task.category,
        dueDate: task.dueDate ?? '',
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const { dueDate, ...rest } = this.form.getRawValue();
    this.saved.emit({ ...rest, ...(dueDate ? { dueDate } : {}) });
  }

  onClose(): void {
    this.closed.emit();
  }
}
