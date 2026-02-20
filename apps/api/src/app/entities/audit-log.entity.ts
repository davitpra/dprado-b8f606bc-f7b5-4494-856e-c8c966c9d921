import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  action: string;

  @Column({ type: 'text' })
  resource: string;

  @Column({ type: 'text' })
  resourceId: string;

  @Column({ type: 'text' })
  userId: string;

  @Column({ type: 'text' })
  ipAddress: string;

  /** Stored as simple-json (text serialization) — works in SQLite and PostgreSQL */
  @Column({ type: 'simple-json' })
  details: Record<string, unknown>;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
