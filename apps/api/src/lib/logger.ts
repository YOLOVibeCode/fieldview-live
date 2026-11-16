/**
 * Structured Logging (Pino)
 * 
 * Centralized logging configuration for API.
 */

import pino, { type LoggerOptions } from 'pino';

/** Field names that hold credentials. Their values never reach a log line. */
const SECRET_KEYS = [
  'password',
  'sessionCookie',
  'secrets',
  'credentials',
  'accessToken',
  'authorization',
  'Authorization',
  'cookie',
  'Cookie',
];

/** Each secret key at the top level and nested up to two objects deep (e.g. `req.headers.cookie`). */
export const REDACTED_LOG_PATHS = SECRET_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]);

export const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  redact: { paths: REDACTED_LOG_PATHS, censor: '[redacted]' },
};

export const logger = pino({
  ...loggerOptions,
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});
