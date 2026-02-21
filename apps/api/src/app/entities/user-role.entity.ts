import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserRole } from '@task-management/data';
import { User } from './user.entity';
import { Department } from './department.entity';

@Entity('user_roles')
@Unique(['userId', 'departmentId'])
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  userId: string;

  @Column({ type: 'text', enum: [UserRole.OWNER, UserRole.ADMIN, UserRole.VIEWER] })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Department, (dept) => dept.userRoles, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department: Department | null;
}
