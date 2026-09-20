export type MuxStreamType =
  | 'live'
  | 'on-demand'
  | 'live:dvr'
  | 'll-live'
  | 'll-live:dvr';

const VOD_GAME_STATES: ReadonlySet<string> = new Set(['ended', 'cancelled']);

/** Bootstrap hint for Mux Player stream-type attribute. */
export function resolveMuxStreamType(
  streamProvider: string,
  gameState: string | null | undefined
): MuxStreamType | undefined {
  if (streamProvider !== 'mux_managed') {
    return undefined;
  }
  if (gameState && VOD_GAME_STATES.has(gameState)) {
    return 'on-demand';
  }
  return 'live:dvr';
}
