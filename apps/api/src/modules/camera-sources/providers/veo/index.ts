/**
 * Veo camera provider — wires Veo's pieces into one ICameraProvider.
 * Everything is plain HTTP: sign-in, token minting and the stream list. No browser.
 */

import type { ConnectField, FetchLike, ICameraProvider } from '../../interfaces';

import { CachingVeoTokenProvider } from './CachingVeoTokenProvider';
import { HttpVeoSessionSeeder } from './HttpVeoSessionSeeder';
import { HttpVeoStreamHistoryClient } from './HttpVeoStreamHistoryClient';
import { HttpVeoTokenMinter } from './HttpVeoTokenMinter';
import { VeoConnector } from './VeoConnector';
import { VEO_PROVIDER_ID, VeoLiveStreamLister } from './VeoLiveStreamLister';
import type { IVeoSessionSeeder } from './types';

export { VEO_PROVIDER_ID } from './VeoLiveStreamLister';

const VEO_CONNECT_FIELDS: readonly ConnectField[] = [
  { name: 'email', label: 'Veo login email', type: 'email', placeholder: 'coach@example.com' },
  {
    name: 'clubUrl',
    label: 'Veo club page',
    type: 'url',
    placeholder: 'https://app.veo.co/clubs/your-club/',
    help: 'Open your club in Veo and copy the address from the browser.',
  },
  {
    name: 'password',
    label: 'Veo password',
    type: 'password',
    help: 'Used once to sign in to Veo. FieldView does not keep it.',
  },
];

export interface VeoProviderDeps {
  fetch?: FetchLike;
  /** Password → session (injectable for tests). Defaults to the plain-HTTP login. */
  sessionSeeder?: IVeoSessionSeeder;
}

export function createVeoProvider(deps: VeoProviderDeps = {}): ICameraProvider {
  const fetch = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const minter = new HttpVeoTokenMinter({ fetch });

  return {
    id: VEO_PROVIDER_ID,
    displayName: 'Veo',
    connectFields: VEO_CONNECT_FIELDS,
    lister: new VeoLiveStreamLister({
      streamClient: new HttpVeoStreamHistoryClient({ fetch }),
      createTokenProvider: (sessionCookie) => new CachingVeoTokenProvider({ minter, sessionCookie }),
    }),
    connector: new VeoConnector({
      sessionSeeder: deps.sessionSeeder ?? new HttpVeoSessionSeeder({ fetch }),
      // Minting a token proves the session cookie is accepted by Veo.
      verifySession: async (sessionCookie) => {
        await minter.mint(sessionCookie);
      },
    }),
  };
}
