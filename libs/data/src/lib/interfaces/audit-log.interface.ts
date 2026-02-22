export interface IAuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  ipAddress: string;
  timestamp: string;
  details: Record<string, unknown>;
  user?: { id: string; firstName: string; lastName: string; email: string };
}
