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
import { UserRoleEntity } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  /** Excluded from all SELECT queries by default — use .addSelect() explicitly */
  @Column({ type: 'text', select: false })
  password: string;

  @Column({ type: 'text' })
  firstName: string;

  @Column({ type: 'text' })
  lastName: string;

  @Column({ type: 'text' })
  organizationId: string;

  @Column({ type: 'boolean', default: false })
  isOwner: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  roles: UserRoleEntity[];
}
