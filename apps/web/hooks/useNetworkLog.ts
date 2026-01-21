/**
 * useNetworkLog Hook
 * 
 * Provides access to network request log and real-time updates
 */

import { useState, useEffect } from 'react';
import { getNetworkLog, addNetworkLogListener, clearNetworkLog, type NetworkRequest } from '@/lib/debug/networkInterceptor';

export function useNetworkLog() {
  const [log, setLog] = useState<NetworkRequest[]>(getNetworkLog());

  useEffect(() => {
    const unsubscribe = addNetworkLogListener(() => {
      setLog([...getNetworkLog()]);
    });
    return unsubscribe;
  }, []);

  return {
    log,
    clear: clearNetworkLog,
    count: log.length,
    failedCount: log.filter(r => r.status && r.status >= 400).length,
  };
}
