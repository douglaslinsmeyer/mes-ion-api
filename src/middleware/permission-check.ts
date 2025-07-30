import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import logger from '../utils/logger';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Check if a permission matches a pattern
 * Supports wildcards: * matches everything, resource:* matches all actions on resource
 */
function matchesPermission(required: string, granted: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;
  
  // Check wildcard patterns
  if (granted.endsWith(':*')) {
    const prefix = granted.slice(0, -2);
    return required.startsWith(prefix + ':');
  }
  
  return false;
}

/**
 * Create a middleware that checks for specific permissions
 */
export function requirePermission(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.permissions) {
        throw new PermissionError('No permissions found in request');
      }

      const hasPermission = req.permissions.some(permission => 
        matchesPermission(requiredPermission, permission)
      );

      if (!hasPermission) {
        logger.warn('Permission denied', {
          clientId: req.clientId,
          requiredPermission,
          grantedPermissions: req.permissions,
        });
        throw new PermissionError(`Permission denied: ${requiredPermission}`);
      }

      next();
    } catch (error) {
      if (error instanceof PermissionError) {
        res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: error.message,
            requiredPermission,
          },
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Common permission constants
 */
export const Permissions = {
  // Manufacturing Order permissions
  MANUFACTURING_ORDER_READ: 'manufacturing-order:read',
  MANUFACTURING_ORDER_WRITE: 'manufacturing-order:write',
  MANUFACTURING_ORDER_DELETE: 'manufacturing-order:delete',
  
  // Work Center permissions
  WORK_CENTER_READ: 'work-center:read',
  WORK_CENTER_WRITE: 'work-center:write',
  
  // Operation permissions
  OPERATION_REPORT: 'operation:report',
  OPERATION_COMPLETE: 'operation:complete',
  
  // Material permissions
  MATERIAL_ISSUE: 'material:issue',
  MATERIAL_RETURN: 'material:return',
  
  // Admin permissions
  ADMIN_API_KEY_MANAGE: 'admin:api-key:manage',
  ADMIN_METRICS_READ: 'admin:metrics:read',
  
  // Webhook permissions
  WEBHOOK_MANAGE: 'webhook:manage',
  WEBHOOK_RECEIVE: 'webhook:receive',
} as const;

/**
 * Permission groups for common roles
 */
export const PermissionGroups = {
  OPERATOR: [
    Permissions.MANUFACTURING_ORDER_READ,
    Permissions.WORK_CENTER_READ,
    Permissions.OPERATION_REPORT,
    Permissions.MATERIAL_ISSUE,
    Permissions.MATERIAL_RETURN,
  ],
  
  SUPERVISOR: [
    Permissions.MANUFACTURING_ORDER_READ,
    Permissions.MANUFACTURING_ORDER_WRITE,
    Permissions.WORK_CENTER_READ,
    Permissions.WORK_CENTER_WRITE,
    Permissions.OPERATION_REPORT,
    Permissions.OPERATION_COMPLETE,
    Permissions.MATERIAL_ISSUE,
    Permissions.MATERIAL_RETURN,
  ],
  
  ADMIN: ['*'], // All permissions
  
  WEBHOOK_SERVICE: [
    Permissions.WEBHOOK_RECEIVE,
  ],
  
  MONITORING_SERVICE: [
    Permissions.ADMIN_METRICS_READ,
  ],
} as const;