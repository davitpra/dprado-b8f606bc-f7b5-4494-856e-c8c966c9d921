import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TaskStore } from '../../../core/stores/task.store';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="task-list">
      @if (taskStore.filteredTasks().length === 0) {
        <div class="empty-state">
          <p>No tasks found. Try adjusting your filters.</p>
        </div>
      } @else {
        <table class="tasks-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            @for (task of taskStore.filteredTasks(); track task.id) {
              <tr class="task-row">
                <td class="title-cell">{{ task.title }}</td>
                <td>
                  <span class="badge status-{{ task.status.toLowerCase().replace('_', '-') }}">
                    {{ task.status }}
                  </span>
                </td>
                <td>
                  <span class="badge priority-{{ task.priority.toLowerCase() }}">
                    {{ task.priority }}
                  </span>
                </td>
                <td>{{ task.category }}</td>
                <td>{{ task.dueDate ? (task.dueDate | date:'mediumDate') : '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .task-list { background: white; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .empty-state { padding: 3rem; text-align: center; color: #6b7280; }
    .tasks-table { width: 100%; border-collapse: collapse; }
    .tasks-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      background: #f9fafb;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }
    .task-row td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
    .task-row:last-child td { border-bottom: none; }
    .title-cell { font-weight: 500; }
    .badge {
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-todo { background: #f3f4f6; color: #374151; }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
    .status-done { background: #d1fae5; color: #065f46; }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #d1fae5; color: #065f46; }
  `],
})
export class TaskListComponent {
  protected taskStore = inject(TaskStore);
}
