import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '@task-management/data';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'invite';
export type PermissionResource = 'task' | 'department' | 'user';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  action: PermissionAction;

  @Column({ type: 'text' })
  resource: PermissionResource;

  @Column({ type: 'text', enum: [UserRole.ADMIN, UserRole.VIEWER] })
  role: UserRole.ADMIN | UserRole.VIEWER;
}
