import { TaskCategory, TaskPriority, TaskStatus } from '../enums/index.js';

export interface ITask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  position: number;
  dueDate?: string;
  createdById: string;
  assignedToId?: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
