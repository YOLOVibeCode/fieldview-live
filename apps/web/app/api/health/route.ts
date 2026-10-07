import { NextResponse } from 'next/server';

import { resolveHealthCommit, resolveHealthEnv } from '@/lib/health-fleet';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    service: 'fieldview-web',
    commit: resolveHealthCommit(),
    env: resolveHealthEnv(),
    utc: new Date().toISOString(),
  });
}
