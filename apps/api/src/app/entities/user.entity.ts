import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@task-management/data';
import { Organization } from './organization.entity';
import { UserRoleEntity } from './user-role.entity';
import { Task } from './task.entity';
import { AuditLog } from './audit-log.entity';

const SALT_ROUNDS = 12;

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  /**
   * Excluded from SELECT queries (select: false) — use .addSelect('user.password') to load.
   * Also excluded from serialization (@Exclude) so it never leaks in API responses.
   */
  @Exclude()
  @Column({ type: 'text', select: false })
  password: string;

  @Column({ type: 'text' })
  firstName: string;

  @Column({ type: 'text' })
  lastName: string;

  @Column({ type: 'text' })
  organizationId: string;

  /** Organization owner — derived from OWNER role in user_roles (departmentId = null). */
  @Expose()
  get isOwner(): boolean {
    return Array.isArray(this.roles) && this.roles.some(r => r.role === UserRole.OWNER);
  }

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  roles: UserRoleEntity[];

  @OneToMany(() => Task, (t) => t.createdBy)
  createdTasks: Task[];

  @OneToMany(() => Task, (t) => t.assignedTo)
  assignedTasks: Task[];

  @OneToMany(() => AuditLog, (al) => al.user)
  auditLogs: AuditLog[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash if the password field was set/changed (loaded via addSelect)
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }
  }
}
