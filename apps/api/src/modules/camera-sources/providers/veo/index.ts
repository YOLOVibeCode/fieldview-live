/**
 * Veo camera provider — wires Veo's pieces into one ICameraProvider.
 * Browser-free: the Playwright login under `./browser` is for seeding scripts
 * only and is deliberately not imported here.
 */

import type { FetchLike, ICameraProvider } from '../../interfaces';

import { CachingVeoTokenProvider } from './CachingVeoTokenProvider';
import { HttpVeoStreamHistoryClient } from './HttpVeoStreamHistoryClient';
import { HttpVeoTokenMinter } from './HttpVeoTokenMinter';
import { VeoConnector } from './VeoConnector';
import { VEO_PROVIDER_ID, VeoLiveStreamLister } from './VeoLiveStreamLister';
import type { IVeoSessionSeeder } from './types';

export { VEO_PROVIDER_ID } from './VeoLiveStreamLister';

export interface VeoProviderDeps {
  fetch?: FetchLike;
  /** Password → session. Supplied by seeding scripts; absent on the server. */
  sessionSeeder?: IVeoSessionSeeder;
}

export function createVeoProvider(deps: VeoProviderDeps = {}): ICameraProvider {
  const fetch = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const minter = new HttpVeoTokenMinter({ fetch });

  return {
    id: VEO_PROVIDER_ID,
    displayName: 'Veo',
    lister: new VeoLiveStreamLister({
      streamClient: new HttpVeoStreamHistoryClient({ fetch }),
      createTokenProvider: (sessionCookie) => new CachingVeoTokenProvider({ minter, sessionCookie }),
    }),
    connector: new VeoConnector({
      sessionSeeder: deps.sessionSeeder,
      // Minting a token proves the session cookie is accepted by Veo.
      verifySession: async (sessionCookie) => {
        await minter.mint(sessionCookie);
      },
    }),
  };
}
