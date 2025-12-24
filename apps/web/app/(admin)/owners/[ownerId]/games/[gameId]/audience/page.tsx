'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { apiClient, ApiError, type AdminGameAudienceResponse } from '@/lib/api-client';
import { getAdminSessionToken } from '@/lib/admin-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type UiState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: AdminGameAudienceResponse };

export default function AdminAudiencePage() {
  const params = useParams();
  const router = useRouter();
  const ownerId = params.ownerId as string;
  const gameId = params.gameId as string;
  const sessionToken = useMemo(() => getAdminSessionToken(), []);

  const [ui, setUi] = useState<UiState>({ kind: 'loading' });

  useEffect(() => {
    const token = sessionToken;
    if (!token) {
      router.replace('/login');
      return;
    }

    let cancelled = false;
    async function load(activeToken: string) {
      try {
        const data = await apiClient.adminGetGameAudience(activeToken, ownerId, gameId);
        if (cancelled) return;
        setUi({ kind: 'ready', data });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setUi({ kind: 'error', message: err.message });
        else setUi({ kind: 'error', message: 'Failed to load audience.' });
      }
    }

    void load(token);
    return () => {
      cancelled = true;
    };
  }, [gameId, ownerId, router, sessionToken]);

  if (ui.kind === 'loading') {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading audience…</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (ui.kind === 'error') {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Audience</CardTitle>
            <CardDescription>{ui.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/console')} aria-label="Back to admin console">
              Back to search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data } = ui;

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Audience</h1>
          <p className="text-sm text-muted-foreground">
            owner {ownerId} • game {gameId}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/console')} aria-label="Back to admin console">
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchasers</CardTitle>
          <CardDescription>
            Purchase→watch conversion: {(data.purchaseToWatchConversionRate * 100).toFixed(1)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.purchasers.length ? (
            <div className="space-y-2 text-sm">
              {data.purchasers.map((p) => (
                <div key={p.purchaseId} className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.emailMasked}</div>
                    <div className="truncate text-muted-foreground">{new Date(p.purchasedAt).toLocaleString()}</div>
                  </div>
                  <div className="text-muted-foreground">{p.watched ? 'watched' : 'not watched'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No purchasers.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watchers</CardTitle>
          <CardDescription>Sessions per purchase</CardDescription>
        </CardHeader>
        <CardContent>
          {data.watchers.length ? (
            <div className="space-y-2 text-sm">
              {data.watchers.map((w) => (
                <div key={w.purchaseId} className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{w.emailMasked}</div>
                    <div className="truncate text-muted-foreground">
                      {w.lastWatchedAt ? new Date(w.lastWatchedAt).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="text-muted-foreground">{w.sessionCount} sessions</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No watchers.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


