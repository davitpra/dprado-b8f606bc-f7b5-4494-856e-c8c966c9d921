import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';
import { User } from './user.entity';
import { Department } from './department.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'text', enum: TaskCategory })
  category: TaskCategory;

  @Column({ type: 'text', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  /** Drag-and-drop order within a status column */
  @Column({ type: 'integer', default: 0 })
  position: number;

  /** ISO 8601 date string — stored as text for SQLite/PostgreSQL compatibility */
  @Column({ type: 'text', nullable: true })
  dueDate: string | null;

  @Column({ type: 'text' })
  createdById: string;

  @Column({ type: 'text', nullable: true })
  assignedToId: string | null;

  @Column({ type: 'text' })
  departmentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /** Soft delete — tasks are never physically removed */
  @DeleteDateColumn()
  deletedAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentId' })
  department: Department;
}
