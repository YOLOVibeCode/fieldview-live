/**
 * VeoConnector — Veo's ICameraConnector.
 *
 * Signs in with the owner's email + password (or accepts an already-issued session
 * cookie), verifies the session, and returns what to store. The password is used
 * once and never stored.
 */

import { z } from 'zod';

import { BadRequestError } from '../../../../lib/errors';
import type { ConnectResult, ICameraConnector } from '../../interfaces';

import type { IVeoSessionSeeder } from './types';
import { extractClubSlug } from './veo-oidc';

const ConnectInputSchema = z
  .object({
    email: z.string().trim().email(),
    clubUrl: z
      .string()
      .trim()
      .url()
      .refine((url) => !!extractClubSlug(url), 'Club URL must look like https://app.veo.co/clubs/<club>/…'),
    password: z.string().min(1).optional(),
    sessionCookie: z.string().trim().min(1).optional(),
  })
  .refine((input) => !!input.password || !!input.sessionCookie, 'Provide a password or a session cookie');

export interface VeoConnectorDeps {
  /** Prove a session cookie works. @throws ConnectionExpiredError when it does not. */
  verifySession: (sessionCookie: string) => Promise<void>;
  /** Password → session. */
  sessionSeeder: IVeoSessionSeeder;
}

export class VeoConnector implements ICameraConnector {
  private readonly verifySession: (sessionCookie: string) => Promise<void>;
  private readonly sessionSeeder: IVeoSessionSeeder;

  constructor(deps: VeoConnectorDeps) {
    this.verifySession = deps.verifySession;
    this.sessionSeeder = deps.sessionSeeder;
  }

  async connect(input: Record<string, string>): Promise<ConnectResult> {
    const parsed = ConnectInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestError('Invalid Veo connection details', parsed.error.errors);
    }
    const { email, clubUrl, password } = parsed.data;

    const sessionCookie =
      parsed.data.sessionCookie ?? (await this.sessionSeeder.seed({ email, password: password as string }));
    await this.verifySession(sessionCookie);

    return { config: { email, clubUrl }, secrets: { sessionCookie } };
  }
}
