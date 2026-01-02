import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import type { IWatchLinkReader, IWatchLinkWriter } from '@/services/IWatchLinkService';
import { WatchLinkService } from '@/services/WatchLinkService';

describe('WatchLinkService', () => {
  let service: WatchLinkService;
  let mockReader: IWatchLinkReader;
  let mockWriter: IWatchLinkWriter;

  beforeEach(() => {
    mockReader = {
      getChannelByOrgAndSlug: vi.fn(),
      getEventCodeByChannelIdAndCode: vi.fn(),
    };
    mockWriter = {
      bindEventCodeToIp: vi.fn(),
    };
    service = new WatchLinkService(mockReader, mockWriter, {
      ipHashSecret: 'test-secret',
      enforceIpBindingWhenCodeProvided: true,
    });
  });

  it('returns HLS url for BYO HLS channel when no event code provided', async () => {
    vi.mocked(mockReader.getChannelByOrgAndSlug).mockResolvedValue({
      id: 'channel-1',
      orgShortName: 'TCHSKISD',
      teamSlug: 'SoccerJV2',
      requireEventCode: false,
      streamType: 'byo_hls',
      hlsManifestUrl: 'https://stream.mux.com/abc.m3u8',
      muxPlaybackId: null,
      externalEmbedUrl: null,
      externalProvider: null,
    });

    const result = await service.getPublicBootstrap({
      orgShortName: 'TCHSKISD',
      teamSlug: 'SoccerJV2',
      eventCode: undefined,
      viewerIp: '1.2.3.4',
    });

    expect(result.playerType).toBe('hls');
    expect(result.streamUrl).toBe('https://stream.mux.com/abc.m3u8');
    expect(result.orgShortName).toBe('TCHSKISD');
    expect(result.teamSlug).toBe('SoccerJV2');
  });

  it('binds event code to first IP and allows subsequent requests from same IP', async () => {
    vi.mocked(mockReader.getChannelByOrgAndSlug).mockResolvedValue({
      id: 'channel-1',
      orgShortName: 'TCHSKISD',
      teamSlug: 'SoccerJV2',
      requireEventCode: false,
      streamType: 'mux_playback',
      hlsManifestUrl: null,
      muxPlaybackId: 'playback-123',
      externalEmbedUrl: null,
      externalProvider: null,
    });
    vi.mocked(mockReader.getEventCodeByChannelIdAndCode).mockResolvedValue({
      id: 'event-1',
      code: '4134254',
      status: 'active',
      boundIpHash: null,
      boundAt: null,
    });

    const first = await service.getPublicBootstrap({
      orgShortName: 'TCHSKISD',
      teamSlug: 'SoccerJV2',
      eventCode: '4134254',
      viewerIp: '10.0.0.1',
    });

    expect(first.streamUrl).toBe('https://stream.mux.com/playback-123.m3u8');
    expect(mockWriter.bindEventCodeToIp).toHaveBeenCalledTimes(1);

    vi.mocked(mockReader.getEventCodeByChannelIdAndCode).mockResolvedValue({
      id: 'event-1',
      code: '4134254',
      status: 'active',
      boundIpHash: vi.mocked(mockWriter.bindEventCodeToIp).mock.calls[0]?.[1] ?? 'iphash',
      boundAt: new Date(),
    });

    const second = await service.getPublicBootstrap({
      orgShortName: 'TCHSKISD',
      teamSlug: 'SoccerJV2',
      eventCode: '4134254',
      viewerIp: '10.0.0.1',
    });

    expect(second.streamUrl).toBe('https://stream.mux.com/playback-123.m3u8');
  });

  it('rejects event code reuse from different IP when bound', async () => {
    vi.mocked(mockReader.getChannelByOrgAndSlug).mockResolvedValue({
      id: 'channel-1',
      orgShortName: 'TCHSKISD',
      teamSlug: 'SoccerJV2',
      requireEventCode: false,
      streamType: 'byo_hls',
      hlsManifestUrl: 'https://example.com/stream.m3u8',
      muxPlaybackId: null,
      externalEmbedUrl: null,
      externalProvider: null,
    });
    vi.mocked(mockReader.getEventCodeByChannelIdAndCode).mockResolvedValue({
      id: 'event-1',
      code: '4134254',
      status: 'active',
      boundIpHash: 'bound-hash',
      boundAt: new Date(),
    });

    await expect(
      service.getPublicBootstrap({
        orgShortName: 'TCHSKISD',
        teamSlug: 'SoccerJV2',
        eventCode: '4134254',
        viewerIp: '10.0.0.99',
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('requires event code when channel requires it', async () => {
    vi.mocked(mockReader.getChannelByOrgAndSlug).mockResolvedValue({
      id: 'channel-1',
      orgShortName: 'TCHSKISD',
      teamSlug: 'SoccerJV2',
      requireEventCode: true,
      streamType: 'byo_hls',
      hlsManifestUrl: 'https://example.com/stream.m3u8',
      muxPlaybackId: null,
      externalEmbedUrl: null,
      externalProvider: null,
    });

    await expect(
      service.getPublicBootstrap({
        orgShortName: 'TCHSKISD',
        teamSlug: 'SoccerJV2',
        eventCode: undefined,
        viewerIp: '10.0.0.1',
      })
    ).rejects.toThrow(UnauthorizedError);
  });
});


