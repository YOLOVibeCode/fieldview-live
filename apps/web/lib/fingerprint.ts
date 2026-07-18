/**
 * Browser Fingerprinting Utility
 *
 * Generates a deterministic fingerprint from browser characteristics.
 * Used for abuse detection (multi-account tracking).
 *
 * Signals used:
 * - Canvas fingerprint (GPU rendering differences)
 * - WebGL fingerprint (GPU info)
 * - Screen properties
 * - Timezone + language
 * - Platform + hardware concurrency
 * - Device memory (if available)
 *
 * @returns SHA-256 hash of fingerprint data
 */

const LOCAL_STORAGE_KEY = 'fv_device_id';

/**
 * Collect fingerprint signals from the browser
 */
async function collectSignals(): Promise<Record<string, string | number | boolean>> {
  const signals: Record<string, string | number | boolean> = {};

  // Screen properties
  signals.screenWidth = window.screen.width;
  signals.screenHeight = window.screen.height;
  signals.colorDepth = window.screen.colorDepth;
  signals.pixelRatio = window.devicePixelRatio || 1;

  // Timezone and language
  signals.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  signals.languages = navigator.languages?.join(',') || navigator.language;

  // Platform info
  signals.platform = navigator.platform;
  signals.hardwareConcurrency = navigator.hardwareConcurrency || 0;

  // Device memory (Chrome only)
  if ('deviceMemory' in navigator) {
    signals.deviceMemory = (navigator as Navigator & { deviceMemory: number }).deviceMemory;
  }

  // Touch support
  signals.touchPoints = navigator.maxTouchPoints || 0;

  // Canvas fingerprint
  signals.canvasHash = getCanvasFingerprint();

  // WebGL fingerprint
  signals.webglHash = getWebGLFingerprint();

  return signals;
}

/**
 * Generate canvas-based fingerprint
 * Different GPUs render text slightly differently
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;

    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // Draw text with various styles
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('FieldView.Live 🏈⚽', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('FieldView.Live 🏈⚽', 4, 17);

    // Get data URL and hash it
    return simpleHash(canvas.toDataURL());
  } catch {
    return 'canvas-error';
  }
}

/**
 * Get WebGL renderer info
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'no-webgl';

    const webgl = gl as WebGLRenderingContext;
    const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');

    if (!debugInfo) return 'no-debug-info';

    const vendor = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return simpleHash(`${vendor}|${renderer}`);
  } catch {
    return 'webgl-error';
  }
}

/**
 * Simple string hash (djb2 algorithm)
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) + hash + char;
  }
  return (hash >>> 0).toString(16);
}

/**
 * Generate SHA-256 hash of signals
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a stable device fingerprint
 *
 * Uses local storage to persist the fingerprint across sessions.
 * Falls back to regenerating if not available.
 *
 * @returns Promise<string> - SHA-256 fingerprint hash
 */
export async function generateFingerprint(): Promise<string> {
  // Check for existing fingerprint in localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        // Validate stored fingerprint format (64 char hex string)
        if (/^[a-f0-9]{64}$/.test(stored)) {
          return stored;
        }
      }
    } catch {
      // localStorage not available, continue
    }
  }

  // Generate new fingerprint
  const signals = await collectSignals();
  const signalString = JSON.stringify(signals, Object.keys(signals).sort());
  const fingerprint = await sha256(signalString);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, fingerprint);
    } catch {
      // localStorage not available, continue
    }
  }

  return fingerprint;
}

/**
 * Clear the stored fingerprint (for testing)
 */
export function clearFingerprint(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // localStorage not available
    }
  }
}

/**
 * Check if fingerprint is already stored
 */
export function hasStoredFingerprint(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return !!stored && /^[a-f0-9]{64}$/.test(stored);
  } catch {
    return false;
  }
}
