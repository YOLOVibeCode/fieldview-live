/**
 * Debug Initialization
 * 
 * Initialize debug tools (network interceptor, console capture)
 * Call this once at app startup
 */

import './networkInterceptor';
import { startConsoleCapture } from './consoleCapture';

export function initDebugTools(): void {
  if (typeof window === 'undefined') return;
  
  // Start console error capture
  startConsoleCapture();
  
  // Network interceptor is initialized via side-effect import
  console.log('[Debug] 🔧 Debug tools initialized');
}
