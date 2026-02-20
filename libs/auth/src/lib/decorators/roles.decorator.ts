import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@task-management/data';

export const ROLES_KEY = 'roles';

/** Restrict access to users with the specified department-scoped roles. Owner always bypasses. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
