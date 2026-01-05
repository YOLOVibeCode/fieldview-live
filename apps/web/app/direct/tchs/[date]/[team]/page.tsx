'use client';

import { DirectHlsAdminPage } from '@/components/direct-stream/DirectHlsAdminPage';
import { buildTchsStreamKey } from '@/lib/tchs-stream-key';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_TCHS_ADMIN_PASSWORD || 'tchs2026';

export default function DirectTchsTeamPage({
  params,
}: {
  params: { date: string; team: string };
}): JSX.Element {
  const streamKey = buildTchsStreamKey({ date: params.date, team: params.team });
  const sharePath = `fieldview.live/direct/tchs/${params.date}/${params.team}`;

  return (
    <DirectHlsAdminPage
      apiPrefix="/api/tchs"
      streamKey={streamKey}
      title="TCHS Live Stream"
      subtitle={`${params.team} • ${params.date}`}
      adminPassword={ADMIN_PASSWORD}
      sharePath={sharePath}
    />
  );
}


