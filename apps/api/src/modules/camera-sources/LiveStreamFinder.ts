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
import { openSecrets as defaultOpenSecrets } from './secrets';

export interface LiveStreamFinderDeps {
  sourceReader: ICameraSourceReader;
  sourceWriter: Pick<ICameraSourceWriter, 'setStatus'>;
  registry: ICameraProviderRegistry;
  /** Decrypt a stored secrets column (injectable for tests). */
  openSecrets?: (sealed: unknown) => Record<string, string>;
}

interface SourceOutcome {
  report: SourceReport;
  streams: LiveStream[];
}

export class LiveStreamFinder implements ILiveStreamFinder {
  private readonly sourceReader: ICameraSourceReader;
  private readonly sourceWriter: Pick<ICameraSourceWriter, 'setStatus'>;
  private readonly registry: ICameraProviderRegistry;
  private readonly openSecrets: (sealed: unknown) => Record<string, string>;

  constructor(deps: LiveStreamFinderDeps) {
    this.sourceReader = deps.sourceReader;
    this.sourceWriter = deps.sourceWriter;
    this.registry = deps.registry;
    this.openSecrets = deps.openSecrets ?? defaultOpenSecrets;
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

      const streams = await provider.lister.listLive({
        id: source.id,
        ownerAccountId: source.ownerAccountId,
        provider: source.provider,
        config: source.config,
        secrets: this.openSecrets(source.secrets),
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
}
