/**
 * Debug Report Exporter
 * 
 * Generates and exports comprehensive debug reports for support tickets
 */

import type { DebugReport, StreamDebugInfo, ApiHealthInfo, NetworkRequest, DebugMetrics } from './types';

interface ExportOptions {
  stream?: StreamDebugInfo;
  api?: ApiHealthInfo;
  chat?: {
    connected: boolean;
    transport: string;
    messageCount: number;
    gameId?: string;
  };
  networkLog: NetworkRequest[];
  consoleErrors: string[];
  metrics: DebugMetrics;
  pageUrl: string;
}

function sanitizeForExport(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Sanitize JWT tokens
    if (data.startsWith('eyJ') && data.length > 50) {
      return '[JWT_REDACTED]';
    }
    // Sanitize emails (show partial)
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      if (local && domain) {
        return `${local.slice(0, 2)}***@${domain}`;
      }
    }
    // Truncate very long strings
    if (data.length > 500) {
      return data.slice(0, 100) + '...[TRUNCATED]';
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForExport);
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys
      if (['password', 'secret', 'token', 'authorization', 'cookie'].some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForExport(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

export function generateDebugReport(options: ExportOptions): DebugReport {
  const report: DebugReport = {
    reportVersion: '1.0',
    generatedAt: new Date().toISOString(),
    pageUrl: options.pageUrl,
    browser: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      screenSize: typeof window !== 'undefined' 
        ? `${window.screen.width}x${window.screen.height}`
        : 'Unknown',
    },
    stream: options.stream ? sanitizeForExport(options.stream) as StreamDebugInfo : undefined,
    api: options.api ? sanitizeForExport(options.api) as ApiHealthInfo : undefined,
    chat: options.chat ? sanitizeForExport(options.chat) as DebugReport['chat'] : undefined,
    networkLog: sanitizeForExport(options.networkLog) as NetworkRequest[],
    consoleErrors: options.consoleErrors,
    metrics: sanitizeForExport(options.metrics) as DebugMetrics,
  };

  return report;
}

export function exportDebugReport(report: DebugReport): void {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fieldview-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
