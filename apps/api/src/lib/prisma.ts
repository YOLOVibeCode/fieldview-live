/**
 * Prisma Client Singleton
 * 
 * Single instance of PrismaClient for the application.
 * Uses Prisma Client from @prisma/client (generated from data-model package).
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
