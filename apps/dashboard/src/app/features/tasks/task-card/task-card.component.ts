import { Component, inject, input, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ITask } from '@task-management/data';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="task-card">
      <div class="card-header">
        <span class="priority-badge priority-{{ task().priority.toLowerCase() }}">
          {{ task().priority }}
        </span>
        <span class="category-badge">{{ task().category }}</span>
      </div>
      <h3 class="task-title">{{ task().title }}</h3>
      @if (task().description) {
        <p class="task-desc">{{ task().description }}</p>
      }
      @if (task().dueDate) {
        <div class="due-date">Due: {{ task().dueDate | date:'mediumDate' }}</div>
      }
      @if (canEdit()) {
        <div class="card-actions">
          <button class="btn-edit" (click)="$event.stopPropagation(); onEdit()">Edit</button>
          <button class="btn-delete" (click)="$event.stopPropagation(); onDelete()">Delete</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .task-card {
      background: white;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 0.5rem;
      cursor: grab;
    }
    .task-card:active { cursor: grabbing; }
    .card-header {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .priority-badge, .category-badge {
      font-size: 0.65rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #d1fae5; color: #065f46; }
    .category-badge { background: #e0e7ff; color: #3730a3; }
    .task-title {
      margin: 0 0 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.3;
    }
    .task-desc {
      margin: 0 0 0.5rem;
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.4;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .due-date { font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.25rem; }
    .card-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f3f4f6;
    }
    .card-actions button {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-edit { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .btn-delete { background: #fff5f5; color: #dc2626; border-color: #fecaca; }
  `],
})
export class TaskCardComponent {
  task = input.required<ITask>();
  private authStore = inject(AuthStore);

  protected canEdit = computed(() => {
    const user = this.authStore.user();
    if (!user) return false;
    if (this.authStore.isOwner()) return true;
    const deptId = this.task().departmentId;
    if (this.authStore.isAdminInDepartment(deptId)) return true;
    // Viewer can edit/delete their own tasks
    return this.task().createdById === user.id;
  });

  onEdit(): void {
    // Handled by parent component via output or store selection
  }

  onDelete(): void {
    // Handled by parent component via output or store selection
  }
}
