import { describe, it, expect, vi } from 'vitest';

import type { CameraSourceRecord } from '../../../repositories/ICameraSourceRepository';
import {
  ConnectionExpiredError,
  type ICameraProvider,
  type ICameraProviderRegistry,
  type LiveStream,
} from '../interfaces';
import { LiveStreamFinder, type ISecretsVault } from '../LiveStreamFinder';

const OWNER = 'owner-1';

function record(overrides: Partial<CameraSourceRecord> = {}): CameraSourceRecord {
  return {
    id: 'cs-1',
    ownerAccountId: OWNER,
    provider: 'veo',
    config: { clubUrl: 'https://app.veo.co/clubs/x/' },
    secrets: { sessionCookie: 'sealed-cookie' },
    status: 'active',
    ...overrides,
  };
}

function provider(id: string, displayName: string, listLive: ICameraProvider['lister']['listLive']): ICameraProvider {
  return { id, displayName, lister: { listLive: vi.fn(listLive) }, connector: { connect: vi.fn() } };
}

function registryOf(...providers: ICameraProvider[]): ICameraProviderRegistry {
  return {
    get: (id) => {
      const found = providers.find((p) => p.id === id);
      if (!found) throw new Error(`Unknown camera provider: "${id}"`);
      return found;
    },
    list: () => providers,
  };
}

/** Stand-in for encryption so tests need no real ciphertext: "open:" / "sealed:" prefixes. */
function fakeVault(opts: { stale?: boolean } = {}): ISecretsVault {
  return {
    open: vi.fn((sealed) =>
      Object.fromEntries(Object.entries(sealed as Record<string, string>).map(([k, v]) => [k, `open:${v}`]))
    ),
    seal: vi.fn((secrets, scope) =>
      Object.fromEntries(
        Object.entries(secrets).map(([k, v]) => [k, `sealed(${scope.ownerAccountId}/${scope.provider}):${v}`])
      )
    ),
    needsReseal: vi.fn(() => opts.stale ?? false),
  };
}

function setup(records: CameraSourceRecord[], ...providers: ICameraProvider[]) {
  const setStatus = vi.fn(async () => {});
  const updateSecrets = vi.fn(async () => {});
  const vault = fakeVault();
  const finder = new LiveStreamFinder({
    sourceReader: { listByOwner: vi.fn(async () => records) },
    sourceWriter: { setStatus, updateSecrets },
    registry: registryOf(...providers),
    vault,
  });
  return { finder, setStatus, updateSecrets, vault };
}

const LIVE: LiveStream = {
  provider: 'veo',
  title: 'Diablos vs Storm',
  streamUrl: 'https://stream.mux.com/L.m3u8',
  startedAt: null,
};

describe('LiveStreamFinder', () => {
  it('returns nothing when the owner has no camera sources', async () => {
    const { finder } = setup([]);
    expect(await finder.findForOwner(OWNER)).toEqual({ streams: [], sources: [] });
  });

  it('asks the provider with the decrypted connection and returns its live streams', async () => {
    const veo = provider('veo', 'Veo', async () => [LIVE]);
    const { finder, vault, updateSecrets } = setup([record()], veo);

    const result = await finder.findForOwner(OWNER);

    expect(vault.open).toHaveBeenCalledWith({ sessionCookie: 'sealed-cookie' }, { ownerAccountId: OWNER, provider: 'veo' });
    expect(updateSecrets).not.toHaveBeenCalled();

    expect(veo.lister.listLive).toHaveBeenCalledWith({
      id: 'cs-1',
      ownerAccountId: OWNER,
      provider: 'veo',
      config: { clubUrl: 'https://app.veo.co/clubs/x/' },
      secrets: { sessionCookie: 'open:sealed-cookie' },
    });
    expect(result).toEqual({ streams: [LIVE], sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }] });
  });

  it('does not call a provider whose source already needs reconnecting', async () => {
    const veo = provider('veo', 'Veo', async () => [LIVE]);
    const { finder } = setup([record({ status: 'needs_reconnect' })], veo);

    const result = await finder.findForOwner(OWNER);

    expect(veo.lister.listLive).not.toHaveBeenCalled();
    expect(result).toEqual({
      streams: [],
      sources: [{ provider: 'veo', displayName: 'Veo', status: 'needs_reconnect' }],
    });
  });

  it('marks the source needs_reconnect when its credential has expired', async () => {
    const veo = provider('veo', 'Veo', async () => {
      throw new ConnectionExpiredError();
    });
    const { finder, setStatus } = setup([record()], veo);

    const result = await finder.findForOwner(OWNER);

    expect(setStatus).toHaveBeenCalledWith('cs-1', 'needs_reconnect');
    expect(result.sources).toEqual([{ provider: 'veo', displayName: 'Veo', status: 'needs_reconnect' }]);
  });

  it('reports a failing provider as error without touching its stored status, and still returns the others', async () => {
    const veo = provider('veo', 'Veo', async () => {
      throw new Error('HTTP 500');
    });
    const other = provider('other', 'Other Cam', async () => [{ ...LIVE, provider: 'other' }]);
    const { finder, setStatus } = setup([record(), record({ id: 'cs-2', provider: 'other' })], veo, other);

    const result = await finder.findForOwner(OWNER);

    expect(setStatus).not.toHaveBeenCalled();
    expect(result.streams).toEqual([{ ...LIVE, provider: 'other' }]);
    expect(result.sources).toEqual([
      { provider: 'veo', displayName: 'Veo', status: 'error' },
      { provider: 'other', displayName: 'Other Cam', status: 'ok' },
    ]);
  });

  it('reports a source whose provider is not registered as error', async () => {
    const { finder } = setup([record({ provider: 'gone' })]);

    expect(await finder.findForOwner(OWNER)).toEqual({
      streams: [],
      sources: [{ provider: 'gone', displayName: 'gone', status: 'error' }],
    });
  });

  it('reports error, without calling the provider, when secrets cannot be decrypted', async () => {
    const veo = provider('veo', 'Veo', async () => [LIVE]);
    const setStatus = vi.fn(async () => {});
    const finder = new LiveStreamFinder({
      sourceReader: { listByOwner: async () => [record()] },
      sourceWriter: { setStatus, updateSecrets: vi.fn(async () => {}) },
      registry: registryOf(veo),
      vault: {
        ...fakeVault(),
        open: () => {
          throw new Error('Could not decrypt camera source secret "sessionCookie"');
        },
      },
    });

    const result = await finder.findForOwner(OWNER);

    expect(veo.lister.listLive).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
    expect(result.sources).toEqual([{ provider: 'veo', displayName: 'Veo', status: 'error' }]);
  });

  it('re-seals secrets stored in an older format, bound to the owner and provider', async () => {
    const veo = provider('veo', 'Veo', async () => [LIVE]);
    const updateSecrets = vi.fn(async () => {});
    const finder = new LiveStreamFinder({
      sourceReader: { listByOwner: async () => [record()] },
      sourceWriter: { setStatus: vi.fn(async () => {}), updateSecrets },
      registry: registryOf(veo),
      vault: fakeVault({ stale: true }),
    });

    const result = await finder.findForOwner(OWNER);

    expect(updateSecrets).toHaveBeenCalledWith('cs-1', { sessionCookie: 'sealed(owner-1/veo):open:sealed-cookie' });
    expect(result.streams).toEqual([LIVE]);
  });

  it('still returns streams when the re-seal cannot be saved', async () => {
    const veo = provider('veo', 'Veo', async () => [LIVE]);
    const finder = new LiveStreamFinder({
      sourceReader: { listByOwner: async () => [record()] },
      sourceWriter: {
        setStatus: vi.fn(async () => {}),
        updateSecrets: vi.fn(async () => {
          throw new Error('database down');
        }),
      },
      registry: registryOf(veo),
      vault: fakeVault({ stale: true }),
    });

    const result = await finder.findForOwner(OWNER);

    expect(result).toEqual({ streams: [LIVE], sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }] });
  });
});
