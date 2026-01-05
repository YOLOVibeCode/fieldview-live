'use client';

import { DirectHlsAdminPage } from '@/components/direct-stream/DirectHlsAdminPage';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_TCHS_ADMIN_PASSWORD || 'tchs2026';

export default function DirectTchsPage(): JSX.Element {
  return (
    <DirectHlsAdminPage
      apiPrefix="/api/tchs"
      streamKey="tchs"
      title="TCHS Live Stream"
      subtitle="TCHS"
      adminPassword={ADMIN_PASSWORD}
      sharePath="fieldview.live/direct/tchs"
    />
  );
}


