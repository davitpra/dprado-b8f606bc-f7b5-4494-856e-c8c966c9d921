import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Request } from 'express';

import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.url;

    // Skip GET requests (reads not audited)
    if (method === 'GET') {
      return next.handle();
    }

    // Skip auth and audit-log routes
    if (url.startsWith('/api/auth') || url.startsWith('/api/audit-log')) {
      return next.handle();
    }

    const action = this.mapMethodToAction(method);
    const resource = this.deriveResource(url);
    const user = req['user'] as { id: string } | undefined;
    const userId = user?.id ?? 'anonymous';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      'unknown';

    return next.handle().pipe(
      tap((responseBody) => {
        // Determine resourceId: from params for update/delete, from response for create
        let resourceId = req.params?.id ?? '';
        if (
          action === 'create' &&
          responseBody &&
          typeof responseBody === 'object' &&
          'id' in responseBody
        ) {
          resourceId = (responseBody as Record<string, unknown>).id as string;
        }

        // Build details object
        const details: Record<string, unknown> = {};
        if (req.body?.departmentId) {
          details.departmentId = req.body.departmentId;
        }
        if (req.params?.id && resource === 'member') {
          // /departments/:id/members — departmentId is in route params
          details.departmentId = req.params.id;
        }
        if (req.params?.departmentId) {
          details.departmentId = req.params.departmentId;
        }

        // Fallback A: extract departmentId from the response entity (covers task update/reorder/delete)
        if (!details['departmentId'] && responseBody && typeof responseBody === 'object') {
          const rb = responseBody as Record<string, unknown>;
          if (rb['departmentId']) {
            details['departmentId'] = rb['departmentId'];
          }
        }

        // Fallback B: for department operations, the dept's own id is its departmentId
        if (!details['departmentId'] && resource === 'department') {
          if (req.params?.id) {
            details['departmentId'] = req.params.id;            // update / delete
          } else if (responseBody && typeof responseBody === 'object' && 'id' in (responseBody as object)) {
            details['departmentId'] = (responseBody as Record<string, unknown>)['id']; // create
          }
        }

        // Include relevant body fields (exclude sensitive data)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...safeBody } = req.body || {};
        if (Object.keys(safeBody).length > 0) {
          details.body = safeBody;
        }

        // Fire-and-forget
        this.auditService.log({
          action,
          resource,
          resourceId: resourceId || '',
          userId,
          ipAddress,
          details,
        });
      }),
      catchError((error) => {
        // Log access denied attempts
        if (error instanceof ForbiddenException && userId !== 'anonymous') {
          this.auditService.log({
            action: 'access_denied',
            resource,
            resourceId: req.params?.id ?? '',
            userId,
            ipAddress,
            details: {
              originalAction: action,
              departmentId:
                req.body?.departmentId || req.params?.id || undefined,
            },
          });
        }
        return throwError(() => error);
      }),
    );
  }

  private mapMethodToAction(method: string): string {
    switch (method) {
      case 'POST':
        return 'create';
      case 'PUT':
        return 'update';
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return method.toLowerCase();
    }
  }

  private deriveResource(url: string): string {
    // Remove /api/ prefix and query params
    const path = url.replace(/^\/api\//, '').split('?')[0];
    const segments = path.split('/').filter(Boolean);

    // Special case: /departments/:id/members → "member"
    if (
      segments.length >= 3 &&
      segments[0] === 'departments' &&
      segments[2] === 'members'
    ) {
      return 'member';
    }

    // First meaningful segment, singularized (remove trailing 's')
    const first = segments[0] || 'unknown';
    return first.endsWith('s') ? first.slice(0, -1) : first;
  }
}
