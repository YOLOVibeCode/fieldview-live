'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { apiClient, ApiError, type AdminPurchaseTimelineResponse } from '@/lib/api-client';
import { getAdminSessionToken } from '@/lib/admin-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type UiState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: AdminPurchaseTimelineResponse };

export default function AdminPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.purchaseId as string;
  const sessionToken = useMemo(() => getAdminSessionToken(), []);

  const [ui, setUi] = useState<UiState>({ kind: 'loading' });

  useEffect(() => {
    if (!sessionToken) {
      router.replace('/login');
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const data = await apiClient.adminGetPurchaseTimeline(sessionToken, purchaseId);
        if (cancelled) return;
        setUi({ kind: 'ready', data });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setUi({ kind: 'error', message: err.message });
        else setUi({ kind: 'error', message: 'Failed to load purchase.' });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [purchaseId, router, sessionToken]);

  if (ui.kind === 'loading') {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading purchase…</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (ui.kind === 'error') {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Purchase</CardTitle>
            <CardDescription>{ui.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/console')}>
              Back to search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data } = ui;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Purchase</h1>
          <p className="text-sm text-muted-foreground">{data.purchaseId}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/console')}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data.purchase.gameTitle}</CardTitle>
          <CardDescription>{data.purchase.viewerEmailMasked || data.purchase.viewerEmail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{data.purchase.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span>{data.purchase.amountCents} cents</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(data.purchase.createdAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Chronological events</CardDescription>
        </CardHeader>
        <CardContent>
          {data.events.length ? (
            <div className="space-y-3 text-sm">
              {data.events.map((e, idx) => (
                <div key={`${e.type}-${idx}`} className="rounded-md border p-3">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium">{e.description}</div>
                    <div className="text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="text-muted-foreground">{e.type}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No events.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


