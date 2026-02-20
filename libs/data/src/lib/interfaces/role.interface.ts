import { UserRole } from '../enums/index.js';

/** UserRole pivot table — department-scoped roles (admin | viewer only, never owner) */
export interface IUserRole {
  id: string;
  userId: string;
  role: UserRole.ADMIN | UserRole.VIEWER;
  departmentId: string;
}
