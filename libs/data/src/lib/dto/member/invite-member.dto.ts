import { IsUUID, IsIn } from 'class-validator';
import { UserRole } from '../../enums/index.js';

export class InviteMemberDto {
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId!: string;

  @IsIn([UserRole.ADMIN, UserRole.VIEWER], {
    message: `role must be one of: ${UserRole.ADMIN}, ${UserRole.VIEWER}`,
  })
  role!: UserRole.ADMIN | UserRole.VIEWER;
}
