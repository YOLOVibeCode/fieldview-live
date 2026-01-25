/**
 * Health Check Endpoint
 * 
 * Returns service health status with dependency checks.
 */

import express, { type Request, Response, Router } from 'express';

import { prisma } from '../lib/prisma';
import { redisClient } from '../lib/redis';

interface HealthCheck {
  status: 'ok' | 'error';
  message?: string;
  latency?: number;
}

interface EmailProviderCheck {
  provider: string;
  configured: boolean;
  from?: string;
}

function checkEmailProvider(): EmailProviderCheck {
  const provider = process.env.EMAIL_PROVIDER || 'mailpit';
  const isSendGrid = provider.toLowerCase() === 'sendgrid';
  
  return {
    provider,
    configured: isSendGrid 
      ? Boolean(process.env.SENDGRID_API_KEY) 
      : true, // Mailpit doesn't need config
    from: isSendGrid 
      ? process.env.SENDGRID_FROM_EMAIL 
      : process.env.EMAIL_FROM || 'notifications@fieldview.live',
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    // Use shorter timeout for health checks (2 seconds)
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout (2s)')), 2000)
      ),
    ]);
    const latency = Date.now() - start;
    return { status: 'ok', latency };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  if (!process.env.REDIS_URL) {
    return {
      status: 'ok',
      message: 'Redis not configured (using in-memory rate limiting)',
    };
  }
  
  try {
    const start = Date.now();
    // Use shorter timeout for health checks (1 second)
    await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout (1s)')), 1000)
      ),
    ]);
    const latency = Date.now() - start;
    return { status: 'ok', latency };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

export function createHealthRouter(): Router {
  const router = express.Router();

  router.get('/health', async (_req: Request, res: Response) => {
    const checks = {
      database: await checkDatabase(),
      redis: await checkRedis(),
    };

    // Always return 200 so Railway considers container healthy
    // Include detailed status in response body for monitoring
    const isHealthy = Object.values(checks).every((check) => check.status === 'ok');
    const overallStatus = isHealthy ? 'ok' : 'degraded';

    res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      email: checkEmailProvider(),
    });
  });

  return router;
}
