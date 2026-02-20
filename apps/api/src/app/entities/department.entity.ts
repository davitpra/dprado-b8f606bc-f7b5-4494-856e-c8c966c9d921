import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Task } from './task.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Organization, (org) => org.departments)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => Task, (t) => t.department)
  tasks: Task[];

  @OneToMany(() => UserRoleEntity, (ur) => ur.department)
  userRoles: UserRoleEntity[];
}
