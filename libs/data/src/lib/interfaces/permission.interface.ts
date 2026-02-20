import { UserRole } from '../enums/index.js';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'invite';
export type PermissionResource = 'task' | 'department' | 'user';

export interface IPermission {
  id: string;
  action: PermissionAction;
  resource: PermissionResource;
  role: UserRole.ADMIN | UserRole.VIEWER;
}
