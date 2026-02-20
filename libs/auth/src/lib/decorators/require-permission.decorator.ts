import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface RequiredPermission {
  action: string;
  resource: string;
}

/** Restrict access based on the Permission table (action + resource → role). Owner always bypasses. */
export const RequirePermission = (action: string, resource: string) =>
  SetMetadata(PERMISSION_KEY, { action, resource } as RequiredPermission);
