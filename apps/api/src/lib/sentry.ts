/**
 * Sentry Error Tracking
 * 
 * Optional error tracking via Sentry. Configured via SENTRY_DSN env var.
 */

import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry if DSN is provided.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    return; // Sentry disabled if no DSN
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
}



