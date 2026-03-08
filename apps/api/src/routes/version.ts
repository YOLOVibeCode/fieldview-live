/**
 * Version Endpoint
 * 
 * Returns the current API version from package.json
 */

import { type Request, type Response, Router, type NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppError } from '../lib/errors';

const router = Router();

router.get('/version', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const version = packageJson.version || 'unknown';
    
    res.json({
      version,
      service: 'api',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(new AppError('INTERNAL_ERROR', 'Failed to read version', 500));
  }
});

export default router;
