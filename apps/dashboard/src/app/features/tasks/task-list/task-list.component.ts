import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TaskStore } from '../../../core/stores/task.store';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
      @if (taskStore.filteredTasks().length === 0) {
        <div class="p-12 text-center text-gray-500 dark:text-gray-400">
          <p>No tasks found. Try adjusting your filters.</p>
        </div>
      } @else {
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Title</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Status</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Priority</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Category</th>
              <th class="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Due Date</th>
            </tr>
          </thead>
          <tbody>
            @for (task of taskStore.filteredTasks(); track task.id) {
              <tr>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-gray-100">{{ task.title }}</td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm">
                  @switch (task.status) {
                    @case ('TODO') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{{ task.status }}</span>
                    }
                    @case ('IN_PROGRESS') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{{ task.status }}</span>
                    }
                    @case ('DONE') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{{ task.status }}</span>
                    }
                  }
                </td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm">
                  @switch (task.priority) {
                    @case ('HIGH') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">{{ task.priority }}</span>
                    }
                    @case ('MEDIUM') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{{ task.priority }}</span>
                    }
                    @case ('LOW') {
                      <span class="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{{ task.priority }}</span>
                    }
                  }
                </td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">{{ task.category }}</td>
                <td class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">{{ task.dueDate ? (task.dueDate | date:'mediumDate') : '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class TaskListComponent {
  protected taskStore = inject(TaskStore);
}
