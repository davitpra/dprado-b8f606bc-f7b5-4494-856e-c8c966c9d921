import { Route } from '@angular/router';
import { TaskBoardComponent } from './task-board/task-board.component';

export const tasksRoutes: Route[] = [
  { path: '', component: TaskBoardComponent },
];
