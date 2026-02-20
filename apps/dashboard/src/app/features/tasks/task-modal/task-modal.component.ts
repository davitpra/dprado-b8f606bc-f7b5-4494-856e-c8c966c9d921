import { Component, inject, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ITask, TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editTask() ? 'Edit Task' : 'New Task' }}</h2>
          <button class="close-btn" (click)="onClose()" aria-label="Close">✕</button>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="title">Title *</label>
            <input id="title" type="text" formControlName="title" placeholder="Task title" />
          </div>
          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              placeholder="Optional description"
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" formControlName="status">
                @for (s of statuses; track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label for="priority">Priority</label>
              <select id="priority" formControlName="priority">
                @for (p of priorities; track p) {
                  <option [value]="p">{{ p }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label for="category">Category</label>
              <select id="category" formControlName="category">
                @for (c of categories; track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="dueDate">Due Date</label>
            <input id="dueDate" type="date" formControlName="dueDate" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="onClose()">Cancel</button>
            <button type="submit" class="btn-submit" [disabled]="form.invalid">
              {{ editTask() ? 'Save Changes' : 'Create Task' }}
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
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .modal-header h2 { margin: 0; font-size: 1.125rem; }
    .close-btn { background: none; border: none; font-size: 1rem; cursor: pointer; color: #6b7280; }
    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }
    label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151; }
    input, select, textarea {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    input:focus, select:focus, textarea:focus {
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
export class TaskModalComponent implements OnInit {
  editTask = input<ITask | null>(null);
  closed = output<void>();

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
    // HTTP call wired when TaskService is implemented
    this.closed.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}
