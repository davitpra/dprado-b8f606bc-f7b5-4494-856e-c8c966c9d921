import { Component, inject, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ITask, TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" (click)="onClose()">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-[520px] max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-5">
          <h2 class="m-0 text-lg text-gray-900 dark:text-gray-100">{{ editTask() ? 'Edit Task' : 'New Task' }}</h2>
          <button class="bg-transparent border-none text-base cursor-pointer text-gray-500 dark:text-gray-400" (click)="onClose()" aria-label="Close">&#10005;</button>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="flex flex-col mb-4">
            <label for="title" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title *</label>
            <input id="title" type="text" formControlName="title" placeholder="Task title"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
          </div>
          <div class="flex flex-col mb-4">
            <label for="description" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              placeholder="Optional description"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="flex flex-col mb-4">
              <label for="status" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
              <select id="status" formControlName="status"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500">
                @for (s of statuses; track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
            </div>
            <div class="flex flex-col mb-4">
              <label for="priority" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Priority</label>
              <select id="priority" formControlName="priority"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500">
                @for (p of priorities; track p) {
                  <option [value]="p">{{ p }}</option>
                }
              </select>
            </div>
            <div class="flex flex-col mb-4">
              <label for="category" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
              <select id="category" formControlName="category"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500">
                @for (c of categories; track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>
          </div>
          <div class="flex flex-col mb-4">
            <label for="dueDate" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Due Date</label>
            <input id="dueDate" type="date" formControlName="dueDate"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button type="button"
              class="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer text-gray-700 dark:text-gray-300"
              (click)="onClose()">Cancel</button>
            <button type="submit"
              class="px-4 py-2 bg-blue-500 text-white border-none rounded-md cursor-pointer font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              [disabled]="form.invalid">
              {{ editTask() ? 'Save Changes' : 'Create Task' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
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
    const values = this.form.getRawValue();
    this.saved.emit(values);
  }

  onClose(): void {
    this.closed.emit();
  }
}
