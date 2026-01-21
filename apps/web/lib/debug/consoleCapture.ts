/**
 * Console Error Capture
 * 
 * Captures console.error calls for debug reports
 */

const capturedErrors: string[] = [];
const MAX_CAPTURED_ERRORS = 100;

let originalError: typeof console.error;
let isCapturing = false;

export function startConsoleCapture(): void {
  if (isCapturing) return;
  
  originalError = console.error;
  isCapturing = true;

  console.error = (...args: unknown[]) => {
    const errorString = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');

    capturedErrors.push(errorString);
    if (capturedErrors.length > MAX_CAPTURED_ERRORS) {
      capturedErrors.shift();
    }

    // Call original console.error
    originalError.apply(console, args);
  };
}

export function stopConsoleCapture(): void {
  if (!isCapturing) return;
  
  console.error = originalError;
  isCapturing = false;
}

export function getCapturedErrors(): string[] {
  return [...capturedErrors];
}

export function clearCapturedErrors(): void {
  capturedErrors.length = 0;
}
