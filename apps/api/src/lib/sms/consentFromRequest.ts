import type { Request } from 'express';

import { SmsConsentRepository } from '../../repositories/implementations/SmsConsentRepository';
import { ViewerIdentityRepository } from '../../repositories/implementations/ViewerIdentityRepository';
import { SmsComplianceService } from '../../services/SmsComplianceService';
import { prisma } from '../prisma';

export function getSmsComplianceFromRequest(): SmsComplianceService {
  const consentRepo = new SmsConsentRepository(prisma);
  const viewerRepo = new ViewerIdentityRepository(prisma);
  return new SmsComplianceService(consentRepo, consentRepo, viewerRepo, viewerRepo);
}

export function requestClientMeta(req: Request): { ipAddress?: string; userAgent?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.socket.remoteAddress ?? undefined;
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ipAddress: ip, userAgent };
}
