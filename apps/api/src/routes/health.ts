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
    await prisma.$queryRaw`SELECT 1`;
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
  try {
    const start = Date.now();
    await redisClient.ping();
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

    const isHealthy = Object.values(checks).every((check) => check.status === 'ok');

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      email: checkEmailProvider(),
    });
  });

  return router;
}
