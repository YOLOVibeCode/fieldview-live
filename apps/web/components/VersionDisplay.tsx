'use client';

/**
 * Version Display Component
 * 
 * Displays the application version in the lower right corner.
 * Version is injected at build time via NEXT_PUBLIC_APP_VERSION.
 */

export function VersionDisplay() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

  return (
    <div
      className="fixed bottom-2 right-2 z-50 px-2 py-1 text-xs text-muted-foreground/60 bg-background/80 backdrop-blur-sm rounded border border-border/50 font-mono"
      data-testid="version-display"
      aria-label={`Application version: ${version}`}
    >
      v{version}
    </div>
  );
}
