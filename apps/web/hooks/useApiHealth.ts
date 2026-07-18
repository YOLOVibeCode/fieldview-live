/**
 * useApiHealth Hook
 * 
 * Tracks API endpoint health and latency
 */

import { useState, useEffect, useCallback } from 'react';
import type { ApiHealthInfo, EndpointHealth } from '@/lib/debug/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

function createEndpointHealth(url: string): EndpointHealth {
  return {
    url,
    lastStatus: 0,
    lastLatency: 0,
    lastChecked: new Date(),
    errorRate: 0,
    avgLatency: 0,
    isHealthy: true,
    requestCount: 0,
    successCount: 0,
  };
}

export function useApiHealth(slug: string | null) {
  const [health, setHealth] = useState<ApiHealthInfo>({
    endpoints: {
      bootstrap: createEndpointHealth(`${API_URL}/api/direct/${slug}/bootstrap`),
      settings: createEndpointHealth(`${API_URL}/api/direct/${slug}/settings`),
      scoreboard: createEndpointHealth(`${API_URL}/api/direct/${slug}/scoreboard`),
      viewers: createEndpointHealth(`${API_URL}/api/direct/${slug}/viewers/active`),
      chat: createEndpointHealth(`${API_URL}/api/public/games/CHAT_ID/chat/stream`),
      unlock: createEndpointHealth(`${API_URL}/api/direct/${slug}/unlock-admin`),
    },
    overallHealth: 'healthy',
  });

  const updateEndpoint = useCallback((name: keyof ApiHealthInfo['endpoints'], update: Partial<EndpointHealth>) => {
    setHealth(prev => {
      const endpoint = { ...prev.endpoints[name], ...update };
      const endpoints = { ...prev.endpoints, [name]: endpoint };
      
      // Calculate overall health
      const healthyCount = Object.values(endpoints).filter(e => e.isHealthy).length;
      const totalCount = Object.keys(endpoints).length;
      const overallHealth = healthyCount === totalCount 
        ? 'healthy' 
        : healthyCount >= totalCount / 2 
        ? 'degraded' 
        : 'unhealthy';

      return { endpoints, overallHealth };
    });
  }, []);

  const checkEndpoint = useCallback(async (name: keyof ApiHealthInfo['endpoints'], url: string, method: string = 'GET') => {
    const startTime = Date.now();
    try {
      const response = await fetch(url, { method, signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - startTime;
      const status = response.status;
      
      const endpoint = health.endpoints[name];
      const requestCount = endpoint.requestCount + 1;
      const successCount = status < 400 ? endpoint.successCount + 1 : endpoint.successCount;
      const errorRate = ((requestCount - successCount) / requestCount) * 100;
      const avgLatency = endpoint.avgLatency 
        ? (endpoint.avgLatency * (requestCount - 1) + latency) / requestCount
        : latency;

      updateEndpoint(name, {
        lastStatus: status,
        lastLatency: latency,
        lastChecked: new Date(),
        errorRate,
        avgLatency,
        isHealthy: status < 500 && errorRate < 50,
        requestCount,
        successCount,
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      const endpoint = health.endpoints[name];
      const requestCount = endpoint.requestCount + 1;
      const errorRate = ((requestCount - endpoint.successCount) / requestCount) * 100;

      updateEndpoint(name, {
        lastStatus: 0,
        lastLatency: latency,
        lastChecked: new Date(),
        errorRate,
        isHealthy: false,
        requestCount,
      });
    }
  }, [health.endpoints, updateEndpoint]);

  // Auto-check endpoints periodically (only in debug mode)
  useEffect(() => {
    if (!slug) return;
    
    const isDebugMode = typeof window !== 'undefined' && (
      window.location.search.includes('debug=true') ||
      window.location.hostname === 'localhost'
    );

    if (!isDebugMode) return;

    // Initial check
    const endpoints = health.endpoints;
    if (endpoints.bootstrap.url.includes(slug)) {
      checkEndpoint('bootstrap', endpoints.bootstrap.url);
    }

    // Periodic checks (every 30 seconds)
    const interval = setInterval(() => {
      if (endpoints.bootstrap.url.includes(slug)) {
        checkEndpoint('bootstrap', endpoints.bootstrap.url);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [slug, checkEndpoint, health.endpoints]);

  return {
    health,
    checkEndpoint,
    updateEndpoint,
  };
}
