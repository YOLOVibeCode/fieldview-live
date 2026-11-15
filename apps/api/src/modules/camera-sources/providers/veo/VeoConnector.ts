/**
 * VeoConnector — Veo's ICameraConnector.
 *
 * Accepts either an already-seeded session cookie, or an email + password that a
 * session seeder turns into one. The session is verified before anything is
 * returned for storage. The password is used once and never stored.
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
  /** Password → session. Absent where no login method is available (the server, today). */
  sessionSeeder?: IVeoSessionSeeder;
}

export class VeoConnector implements ICameraConnector {
  private readonly verifySession: (sessionCookie: string) => Promise<void>;
  private readonly sessionSeeder?: IVeoSessionSeeder;

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

    const sessionCookie = parsed.data.sessionCookie ?? (await this.seedSession(email, password as string));
    await this.verifySession(sessionCookie);

    return { config: { email, clubUrl }, secrets: { sessionCookie } };
  }

  private async seedSession(email: string, password: string): Promise<string> {
    if (!this.sessionSeeder) {
      throw new BadRequestError('Veo password login is not available on this server yet');
    }
    return this.sessionSeeder.seed({ email, password });
  }
}
