import { Route } from '@angular/router';
import { TaskDashboardComponent } from './task-board/task-board.component';

export const tasksRoutes: Route[] = [
  { path: '', component: TaskDashboardComponent },
];
