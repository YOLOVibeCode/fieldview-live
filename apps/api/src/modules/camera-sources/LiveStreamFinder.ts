/**
 * LiveStreamFinder — "what is live right now for this owner?" across every camera
 * source they have connected. The single path used by both the admin search
 * button and the scheduled sync, so no provider logic is repeated.
 */

import { logger } from '../../lib/logger';
import type {
  CameraSourceRecord,
  ICameraSourceReader,
  ICameraSourceWriter,
} from '../../repositories/ICameraSourceRepository';

import {
  ConnectionExpiredError,
  type ICameraProviderRegistry,
  type ILiveStreamFinder,
  type LiveStream,
  type OwnerLiveStreams,
  type SourceHealth,
  type SourceReport,
} from './interfaces';
import { openSecrets, sealSecrets, secretsNeedReseal, type SecretScope } from './secrets';

/** Opens and seals a source's secrets (injectable for tests). */
export interface ISecretsVault {
  open(sealed: unknown, scope: SecretScope): Record<string, string>;
  seal(secrets: Record<string, string>, scope: SecretScope): Record<string, string>;
  needsReseal(sealed: unknown): boolean;
}

const defaultVault: ISecretsVault = { open: openSecrets, seal: sealSecrets, needsReseal: secretsNeedReseal };

export interface LiveStreamFinderDeps {
  sourceReader: ICameraSourceReader;
  sourceWriter: Pick<ICameraSourceWriter, 'setStatus' | 'updateSecrets'>;
  registry: ICameraProviderRegistry;
  vault?: ISecretsVault;
}

interface SourceOutcome {
  report: SourceReport;
  streams: LiveStream[];
}

export class LiveStreamFinder implements ILiveStreamFinder {
  private readonly sourceReader: ICameraSourceReader;
  private readonly sourceWriter: Pick<ICameraSourceWriter, 'setStatus' | 'updateSecrets'>;
  private readonly registry: ICameraProviderRegistry;
  private readonly vault: ISecretsVault;

  constructor(deps: LiveStreamFinderDeps) {
    this.sourceReader = deps.sourceReader;
    this.sourceWriter = deps.sourceWriter;
    this.registry = deps.registry;
    this.vault = deps.vault ?? defaultVault;
  }

  async findForOwner(ownerAccountId: string): Promise<OwnerLiveStreams> {
    const sources = await this.sourceReader.listByOwner(ownerAccountId);
    // One source failing must not hide another's streams.
    const outcomes = await Promise.all(sources.map((source) => this.findForSource(source)));
    return {
      streams: outcomes.flatMap((o) => o.streams),
      sources: outcomes.map((o) => o.report),
    };
  }

  private async findForSource(source: CameraSourceRecord): Promise<SourceOutcome> {
    let displayName = source.provider;
    const outcome = (status: SourceHealth, streams: LiveStream[] = []): SourceOutcome => ({
      report: { provider: source.provider, displayName, status },
      streams,
    });

    try {
      const provider = this.registry.get(source.provider);
      displayName = provider.displayName;
      if (source.status === 'needs_reconnect') return outcome('needs_reconnect');

      const scope: SecretScope = { ownerAccountId: source.ownerAccountId, provider: source.provider };
      const secrets = this.vault.open(source.secrets, scope);
      await this.resealIfStale(source, secrets, scope);

      const streams = await provider.lister.listLive({
        id: source.id,
        ownerAccountId: source.ownerAccountId,
        provider: source.provider,
        config: source.config,
        secrets,
      });
      return outcome('ok', streams);
    } catch (err) {
      if (err instanceof ConnectionExpiredError) {
        // Remember it, so we stop calling the provider with a dead credential.
        await this.sourceWriter.setStatus(source.id, 'needs_reconnect').catch((writeErr) => {
          logger.error({ err: writeErr, cameraSourceId: source.id }, 'Could not mark camera source needs_reconnect');
        });
        logger.warn({ cameraSourceId: source.id, provider: source.provider }, 'Camera source needs reconnecting');
        return outcome('needs_reconnect');
      }
      logger.error({ err, cameraSourceId: source.id, provider: source.provider }, 'Camera source lookup failed');
      return outcome('error');
    }
  }

  /** Upgrade secrets stored in an older format or under a rotated key. Best effort: never blocks a lookup. */
  private async resealIfStale(
    source: CameraSourceRecord,
    secrets: Record<string, string>,
    scope: SecretScope
  ): Promise<void> {
    if (!this.vault.needsReseal(source.secrets)) return;
    try {
      await this.sourceWriter.updateSecrets(source.id, this.vault.seal(secrets, scope));
      logger.info({ cameraSourceId: source.id }, 'Camera source secrets re-sealed');
    } catch (err) {
      logger.error({ err, cameraSourceId: source.id }, 'Could not re-seal camera source secrets');
    }
  }
}
