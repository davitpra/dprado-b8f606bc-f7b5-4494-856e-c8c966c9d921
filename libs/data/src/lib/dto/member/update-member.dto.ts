import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserRole } from '../../enums/index.js';

export class UpdateMemberDto {
  @ApiProperty({ enum: [UserRole.ADMIN, UserRole.VIEWER], example: UserRole.VIEWER, description: 'New role to assign' })
  @IsIn([UserRole.ADMIN, UserRole.VIEWER], {
    message: `role must be one of: ${UserRole.ADMIN}, ${UserRole.VIEWER}`,
  })
  role!: UserRole.ADMIN | UserRole.VIEWER;
}
