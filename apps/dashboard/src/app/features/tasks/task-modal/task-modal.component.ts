import { Component, inject, input, output, OnInit, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ITask, TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';
import { DepartmentStore } from '../../../core/stores/department.store';

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
  private departmentStore = inject(DepartmentStore);

  protected statuses = Object.values(TaskStatus);
  protected priorities = Object.values(TaskPriority);
  protected categories = Object.values(TaskCategory);
  protected departmentMembers = computed(() => this.departmentStore.members().map((m) => m.user));

  private membersPatchedOnce = false;

  constructor() {
    effect(() => {
      const members = this.departmentMembers();
      if (members.length > 0 && !this.membersPatchedOnce) {
        this.membersPatchedOnce = true;
        const task = this.editTask();
        if (task?.assignedToId) {
          this.form.patchValue({ assignedToId: task.assignedToId });
        }
      }
    });
  }

  protected form = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    status: [TaskStatus.TODO, Validators.required],
    priority: [TaskPriority.MEDIUM, Validators.required],
    category: [TaskCategory.WORK, Validators.required],
    dueDate: [''],
    assignedToId: [null as string | null],
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
        assignedToId: task.assignedToId ?? null,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const { dueDate, assignedToId, ...rest } = this.form.getRawValue();
    this.saved.emit({
      ...rest,
      ...(dueDate ? { dueDate } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    });
  }

  onClose(): void {
    this.closed.emit();
  }
}
