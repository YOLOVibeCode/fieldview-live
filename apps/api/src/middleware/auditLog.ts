/**
 * Audit Logging Middleware
 * 
 * Logs admin actions to AdminAuditLog for compliance and auditing.
 */

import type { Response, NextFunction } from 'express';

import { prisma } from '../lib/prisma';

import type { AuthRequest } from './auth';

export interface AuditLogOptions {
  actionType: string;
  targetType: string;
  targetId?: string;
  reason?: string;
}

/**
 * Audit logging middleware
 * 
 * Logs admin action to AdminAuditLog table.
 */
export function auditLog(options: AuditLogOptions) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    // Store original json method to restore after logging
    const originalJson = _res.json.bind(_res);
    
    // Override json to capture response and log after response
    _res.json = function (body: unknown) {
      // Log audit entry (fire and forget)
      void (async () => {
        try {
          const adminUserId = req.adminUserId;
          if (!adminUserId) {
            return; // Not an admin action
          }

          // Redact sensitive data from request metadata
          const requestMetadata = {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            method: req.method,
            path: req.path,
            // Don't log request body to avoid logging passwords, tokens, etc.
          };

          await prisma.adminAuditLog.create({
            data: {
              adminUserId,
              actionType: options.actionType,
              targetType: options.targetType,
              targetId: options.targetId || req.params[options.targetType] || undefined,
              reason: options.reason,
              requestMetadata,
            },
          });
        } catch (error) {
          // Don't fail the request if audit logging fails
          console.error('Audit logging failed:', error);
        }
      })();

      return originalJson(body);
    };

    next();
  };
}
