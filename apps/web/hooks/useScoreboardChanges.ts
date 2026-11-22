'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  scoreboardChangeClient,
  type ScoreboardChangeRecord,
} from '@/lib/api/scoreboard/scoreboardChangeApi';

export function useScoreboardChanges(slug: string | null): {
  changes: ScoreboardChangeRecord[];
  refresh: () => Promise<void>;
} {
  const [changes, setChanges] = useState<ScoreboardChangeRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!slug) {
      setChanges([]);
      return;
    }
    try {
      setChanges(await scoreboardChangeClient.listRecent(slug));
    } catch {
      setChanges([]);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { changes, refresh };
}
