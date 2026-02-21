import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsIn } from 'class-validator';
import { UserRole } from '../../enums/index.js';

export class InviteMemberDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'User UUID to invite' })
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId!: string;

  @ApiProperty({ enum: [UserRole.ADMIN, UserRole.VIEWER], example: UserRole.VIEWER, description: 'Role to assign' })
  @IsIn([UserRole.ADMIN, UserRole.VIEWER], {
    message: `role must be one of: ${UserRole.ADMIN}, ${UserRole.VIEWER}`,
  })
  role!: UserRole.ADMIN | UserRole.VIEWER;
}
