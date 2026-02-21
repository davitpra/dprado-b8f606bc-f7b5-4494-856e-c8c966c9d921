import { UserRole } from '../enums/index.js';

/** UserRole pivot table — roles include OWNER (org-wide, departmentId=null) and dept-scoped (ADMIN | VIEWER). */
export interface IUserRole {
  id: string;
  userId: string;
  role: UserRole;
  departmentId: string | null;
}
