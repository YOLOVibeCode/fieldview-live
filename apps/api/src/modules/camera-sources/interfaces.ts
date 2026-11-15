/**
 * Camera Sources — provider-neutral contracts (ISP).
 *
 * A "camera source" is a connected camera-platform account (Veo, …) that FieldView
 * can ask "what is live right now?". Not `streamProvider` (how a stream is played)
 * and not `StreamSource` (a Game's playback config).
 */

// ── Live streams ─────────────────────────────────────────────────────────────

/** One stream that is live right now on a camera platform. */
export interface LiveStream {
  /** Registry id of the provider it came from, e.g. 'veo'. */
  provider: string;
  /** Human title, e.g. "Home vs Away". Shown to the admin and used for fuzzy matching. */
  title: string;
  /** Playable URL (HLS). */
  streamUrl: string;
  /** When the broadcast started, if the platform says. Tells apart streams with similar titles. */
  startedAt: Date | null;
}

/** A stored camera source with its secrets decrypted. In memory only — never log or return it. */
export interface CameraConnection {
  id: string;
  ownerAccountId: string;
  provider: string;
  /** Non-secret settings (e.g. account email, club URL). */
  config: Record<string, unknown>;
  /** Decrypted secrets (e.g. session cookie). */
  secrets: Record<string, string>;
}

/** Raised when a stored credential no longer works → the owner must reconnect. */
export class ConnectionExpiredError extends Error {
  constructor(message = 'Camera source credential expired — reconnect required') {
    super(message);
    this.name = 'ConnectionExpiredError';
  }
}

// ── What every provider implements ───────────────────────────────────────────

/** Run time: what is live right now on this connection? */
export interface ILiveStreamLister {
  /** @throws ConnectionExpiredError when the stored credential no longer works. */
  listLive(connection: CameraConnection): Promise<LiveStream[]>;
}

/** What a provider hands back to be stored after a successful connect. */
export interface ConnectResult {
  config: Record<string, unknown>;
  /** Plaintext here; encrypted before it is stored. */
  secrets: Record<string, string>;
}

/** Connect time: turn what the owner supplied into what we store. */
export interface ICameraConnector {
  connect(input: Record<string, string>): Promise<ConnectResult>;
}

/** One input the owner fills in to connect a platform. Drives the Connect form. */
export interface ConnectField {
  /** Key in the input passed to ICameraConnector.connect. */
  name: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'password';
  placeholder?: string;
  help?: string;
}

/** One registry entry per camera platform. */
export interface ICameraProvider {
  readonly id: string;
  readonly displayName: string;
  readonly connectFields: readonly ConnectField[];
  readonly lister: ILiveStreamLister;
  readonly connector: ICameraConnector;
}

export interface ICameraProviderRegistry {
  /** @throws when the id is not registered. */
  get(id: string): ICameraProvider;
  list(): readonly ICameraProvider[];
}

// ── Finding live streams for an owner (used by the admin search AND the cron) ─

export type SourceHealth = 'ok' | 'needs_reconnect' | 'error';

export interface SourceReport {
  provider: string;
  displayName: string;
  status: SourceHealth;
}

export interface OwnerLiveStreams {
  streams: LiveStream[];
  /** One entry per connected source, so callers can tell "nothing live" from "not working". */
  sources: SourceReport[];
}

export interface ILiveStreamFinder {
  findForOwner(ownerAccountId: string): Promise<OwnerLiveStreams>;
}

// ── Matching live streams to scheduled games ─────────────────────────────────

/** Minimum fuzzy-match confidence before a stream URL is written to a game. */
export const DEFAULT_MIN_CONFIDENCE = 0.7;

export interface MatchCandidate {
  eventId: string;
  eventSlug: string;
  title: string;
  directStreamSlug: string;
  currentStreamUrl: string | null;
}

export interface StreamMatch {
  stream: LiveStream;
  event: MatchCandidate;
  confidence: number;
}

export interface UpdateResult {
  updated: number;
  skipped: number;
  details: Array<{
    eventSlug: string;
    oldUrl: string | null;
    newUrl: string;
    confidence: number;
  }>;
}

export interface SyncResult {
  found: number;
  matched: number;
  updated: number;
  skipped: number;
  details: UpdateResult['details'];
}

/** Fuzzy-match live streams to DirectStreamEvent candidates. */
export interface IStreamMatcher {
  match(streams: LiveStream[], candidates: MatchCandidate[]): Promise<StreamMatch[]>;
}

/** Persist matched stream URLs to DirectStreamEvent. */
export interface IStreamUrlUpdater {
  updateStreamUrls(matches: StreamMatch[]): Promise<UpdateResult>;
}

/** Load DirectStreamEvent candidates for an owner account (for matching). */
export interface ICandidateReader {
  getCandidates(ownerAccountId: string): Promise<MatchCandidate[]>;
}

/** One pass: find live streams → match to games → save the links. */
export interface ILiveStreamSyncer {
  syncOwner(ownerAccountId: string, opts?: { minConfidence?: number }): Promise<SyncResult>;
}

export interface PollingConfig {
  ownerAccountId: string;
  minConfidence?: number;
  intervalMs?: number;
  maxDurationMs?: number;
  stopOnFirstMatch?: boolean;
  onStop?: () => void;
}

/** Repeat the sync on an interval until stopped, matched, or out of time. */
export interface ILiveStreamPoller {
  start(config: PollingConfig): Promise<void>;
  stop(): Promise<void>;
  pollOnce(): Promise<SyncResult>;
}

// ── HTTP seam shared by providers (satisfied by the global `fetch`) ──────────

export interface HttpResponse {
  status: number;
  headers: {
    get(name: string): string | null;
    /** Each Set-Cookie header separately (the global `fetch` provides this). */
    getSetCookie?(): string[];
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: 'follow' | 'manual';
  }
) => Promise<HttpResponse>;
