/**
 * Version Endpoint
 * 
 * Returns the current API version from package.json
 */

import { type Request, type Response, Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

router.get('/version', (_req: Request, res: Response) => {
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
    res.status(500).json({
      error: 'Failed to read version',
      version: 'unknown',
    });
  }
});

export default router;
