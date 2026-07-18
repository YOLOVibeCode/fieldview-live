/**
 * Network Request Interceptor
 * 
 * Intercepts fetch and XHR requests to log network activity for debugging
 * 
 * NOTE: This module has side effects - it modifies global fetch and XMLHttpRequest
 * Import this module once at app initialization
 */

import type { NetworkRequest, NetworkRequestType } from './types';

const MAX_LOG_SIZE = 50;
const networkLog: NetworkRequest[] = [];
const listeners = new Set<(request: NetworkRequest) => void>();

export function addNetworkLogListener(listener: (request: NetworkRequest) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNetworkLog(): NetworkRequest[] {
  return [...networkLog];
}

export function clearNetworkLog(): void {
  networkLog.length = 0;
}

function addToLog(request: NetworkRequest): void {
  networkLog.push(request);
  if (networkLog.length > MAX_LOG_SIZE) {
    networkLog.shift(); // Remove oldest
  }
  listeners.forEach(listener => listener(request));
}

// Only initialize interceptors if in browser
if (typeof window !== 'undefined') {
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options = {}] = args;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const startTime = new Date();
    
    const request: NetworkRequest = {
      id: requestId,
      url: typeof url === 'string' ? url : url.toString(),
      method: options.method || 'GET',
      type: 'fetch',
      startTime,
      requestHeaders: {},
      requestBody: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
    };

    // Extract headers
    if (options.headers) {
      const headers = new Headers(options.headers);
      headers.forEach((value, key) => {
        request.requestHeaders[key] = value;
      });
    }

    try {
      const response = await originalFetch.apply(this, args);
      const endTime = new Date();
      
      request.endTime = endTime;
      request.duration = endTime.getTime() - startTime.getTime();
      request.status = response.status;
      request.statusText = response.statusText;
      
      // Extract response headers
      response.headers.forEach((value, key) => {
        if (!request.responseHeaders) request.responseHeaders = {};
        request.responseHeaders[key] = value;
      });

      // Try to capture response body (clone response first)
      const clonedResponse = response.clone();
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await clonedResponse.json();
          request.responseBody = data;
          request.size = JSON.stringify(data).length;
        } else if (contentType.includes('text/')) {
          const text = await clonedResponse.text();
          request.responseBody = text;
          request.size = text.length;
        }
      } catch {
        // Ignore body parsing errors
      }

      addToLog(request);
      return response;
    } catch (error) {
      const endTime = new Date();
      request.endTime = endTime;
      request.duration = endTime.getTime() - startTime.getTime();
      request.error = error instanceof Error ? error.message : String(error);
      addToLog(request);
      throw error;
    }
  };

  // Intercept XHR (for completeness, though we primarily use fetch)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: unknown[]) {
    (this as any)._debugRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    (this as any)._debugUrl = typeof url === 'string' ? url : url.toString();
    (this as any)._debugMethod = method;
    (this as any)._debugStartTime = new Date();
    return originalXHROpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    const requestId = (this as any)._debugRequestId;
    const url = (this as any)._debugUrl;
    const method = (this as any)._debugMethod;
    const startTime = (this as any)._debugStartTime;

    const request: NetworkRequest = {
      id: requestId,
      url,
      method,
      type: 'xhr',
      startTime,
      requestHeaders: {},
      requestBody: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined,
    };

    // Capture headers
    const headers = this.getAllResponseHeaders();
    if (headers) {
      headers.split('\r\n').forEach(line => {
        const [key, value] = line.split(': ');
        if (key && value) {
          request.requestHeaders[key] = value;
        }
      });
    }

    this.addEventListener('loadend', () => {
      const endTime = new Date();
      request.endTime = endTime;
      request.duration = endTime.getTime() - startTime.getTime();
      request.status = this.status;
      request.statusText = this.statusText;
      
      // Try to capture response
      try {
        const responseText = this.responseText;
        if (responseText) {
          const contentType = this.getResponseHeader('content-type') || '';
          if (contentType.includes('application/json')) {
            request.responseBody = JSON.parse(responseText);
          } else {
            request.responseBody = responseText;
          }
          request.size = responseText.length;
        }
      } catch {
        // Ignore parsing errors
      }

      addToLog(request);
    });

    this.addEventListener('error', () => {
      const endTime = new Date();
      request.endTime = endTime;
      request.duration = endTime.getTime() - startTime.getTime();
      request.error = 'Network error';
      addToLog(request);
    });

    return originalXHRSend.apply(this, [body] as any);
  };
}

// Export NetworkRequest type for use in other modules
export type { NetworkRequest };
