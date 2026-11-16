/**
 * Owner Camera Sources ("Streaming providers") Routes.
 *
 *   GET    /me/camera-sources            — every supported provider + this owner's connection
 *   PUT    /me/camera-sources/:provider  — connect or reconnect (signs in on the provider)
 *   DELETE /me/camera-sources/:provider  — disconnect
 *
 * Credentials go in and never come back: responses carry status and non-secret settings only.
 */

import express, { type NextFunction, type Response, type Router } from 'express';
import { z } from 'zod';

import { AppError, BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { logger } from '../lib/logger';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { cameraSourceConnectRateLimit } from '../middleware/rateLimit';
import {
  ConnectionExpiredError,
  cameraProviderRegistry,
  cameraSources,
  sealSecrets,
  type ICameraProvider,
  type ICameraProviderRegistry,
} from '../modules/camera-sources';
import type {
  CameraSourceRecord,
  ICameraSourceReader,
  ICameraSourceWriter,
} from '../repositories/ICameraSourceRepository';

export interface OwnersCameraSourcesRouterDeps {
  registry?: ICameraProviderRegistry;
  sources?: ICameraSourceReader & ICameraSourceWriter;
}

const ConnectBodySchema = z.object({
  fields: z.record(z.string().max(2048)),
});

/** What an owner may see about their own connection: never the secrets. */
function connectionView(source: CameraSourceRecord): { status: string; config: Record<string, unknown> } {
  return { status: source.status, config: source.config };
}

function ownerAccountIdOf(req: AuthRequest): string {
  if (!req.ownerAccountId) {
    throw new UnauthorizedError('Owner account ID not found');
  }
  return req.ownerAccountId;
}

export function createOwnersCameraSourcesRouter(deps: OwnersCameraSourcesRouterDeps = {}): Router {
  const registry = deps.registry ?? cameraProviderRegistry;
  const sources = deps.sources ?? cameraSources;
  const router = express.Router();

  function providerOr404(id: string | undefined): ICameraProvider {
    const provider = registry.list().find((p) => p.id === id);
    if (!provider) {
      throw new NotFoundError('Unknown streaming provider');
    }
    return provider;
  }

  router.get('/me/camera-sources', requireOwnerAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const connected = await sources.listByOwner(ownerAccountIdOf(req));
        res.json({
          providers: registry.list().map((provider) => {
            const source = connected.find((s) => s.provider === provider.id);
            return {
              id: provider.id,
              displayName: provider.displayName,
              connectFields: provider.connectFields,
              connection: source ? connectionView(source) : null,
            };
          }),
        });
      } catch (error) {
        next(error);
      }
    })();
  });

  router.put(
    '/me/camera-sources/:provider',
    requireOwnerAuth,
    cameraSourceConnectRateLimit,
    (req: AuthRequest, res: Response, next: NextFunction) => {
      void (async () => {
        try {
          const ownerAccountId = ownerAccountIdOf(req);
          const provider = providerOr404(req.params.provider);
          const body = ConnectBodySchema.safeParse(req.body);
          if (!body.success) {
            throw new BadRequestError('Invalid request', body.error.errors);
          }

          let result;
          try {
            result = await provider.connector.connect(body.data.fields);
          } catch (err) {
            if (err instanceof AppError) throw err; // e.g. wrong email or password
            if (err instanceof ConnectionExpiredError) {
              throw new BadRequestError(`${provider.displayName} did not accept the sign-in. Check the details and try again.`);
            }
            // The provider is down or changed its sign-in. Keep the cause in our logs only.
            logger.error({ err, ownerAccountId, provider: provider.id }, 'Camera source connect failed');
            throw new AppError(
              'PROVIDER_UNAVAILABLE',
              `Could not reach ${provider.displayName} right now. Try again in a moment.`,
              502
            );
          }

          const saved = await sources.upsert({
            ownerAccountId,
            provider: provider.id,
            config: result.config,
            secrets: sealSecrets(result.secrets, { ownerAccountId, provider: provider.id }),
          });
          logger.info({ ownerAccountId, provider: provider.id }, 'Camera source connected');

          res.json({ id: provider.id, displayName: provider.displayName, connection: connectionView(saved) });
        } catch (error) {
          next(error);
        }
      })();
    }
  );

  router.delete('/me/camera-sources/:provider', requireOwnerAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerAccountId = ownerAccountIdOf(req);
        const provider = providerOr404(req.params.provider);
        const disconnected = await sources.deleteByOwnerAndProvider(ownerAccountId, provider.id);
        if (disconnected) {
          logger.info({ ownerAccountId, provider: provider.id }, 'Camera source disconnected');
        }
        res.json({ disconnected });
      } catch (error) {
        next(error);
      }
    })();
  });

  return router;
}
