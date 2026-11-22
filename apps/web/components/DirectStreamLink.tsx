'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { Button } from '@/components/ui/button';
import { currentOrigin, directStreamUrl, displayLink } from '@/lib/direct-links';
import { cn } from '@/lib/utils';

/** How long the button says "Copied" before it goes back. */
const FEEDBACK_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

const BUTTON_TEXT: Record<CopyState, string> = {
  idle: 'Copy link',
  copied: 'Copied',
  failed: 'Copy failed',
};

/** What a screen reader hears after a click. */
const ANNOUNCEMENT: Record<CopyState, string> = {
  idle: '',
  copied: 'Link copied',
  failed: 'Copy failed. Select the link to copy it.',
};

export interface DirectStreamLinkProps {
  slug: string;
  /** Show the Copy link button (the default). Off for pages viewers can no longer open. */
  copyable?: boolean;
  className?: string;
}

/**
 * A game page's link, in full, with a button that copies it. Clicks stop here, so it can
 * sit inside a row that does something else when clicked.
 */
export function DirectStreamLink({ slug, copyable = true, className }: DirectStreamLinkProps) {
  const url = directStreamUrl(currentOrigin(), slug);
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function copy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    let next: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Blocked by the browser, or no clipboard at all: the link stays on screen to select.
      next = 'failed';
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), FEEDBACK_MS);
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        onClick={(event) => event.stopPropagation()}
        className="min-w-0 truncate font-mono text-xs text-primary hover:underline"
        data-testid={`link-direct-${slug}`}
      >
        {displayLink(url)}
      </a>
      {copyable && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={(event) => void copy(event)}
            data-testid={`btn-copy-link-${slug}`}
          >
            {BUTTON_TEXT[state]}
          </Button>
          <span role="status" className="sr-only">
            {ANNOUNCEMENT[state]}
          </span>
        </>
      )}
    </div>
  );
}
