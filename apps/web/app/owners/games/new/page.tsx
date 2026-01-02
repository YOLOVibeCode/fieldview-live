'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

type CreatedGame = {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  priceCents: number;
  currency: string;
  keywordCode: string;
  qrUrl: string;
};

function centsToUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

async function ownerApi<TResponse>(endpoint: string, token: string, body?: unknown): Promise<TResponse> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }

  return (await res.json()) as TResponse;
}

export default function OwnerCreateGamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedGame | null>(null);

  const [title, setTitle] = useState('E2E Test Game');
  const [homeTeam, setHomeTeam] = useState('Home Team');
  const [awayTeam, setAwayTeam] = useState('Away Team');
  const [startsAt, setStartsAt] = useState(() => {
    const dt = new Date(Date.now() + 60 * 60 * 1000);
    return dt.toISOString().slice(0, 16);
  });
  const [priceCents, setPriceCents] = useState(0);

  const checkoutLink = useMemo(() => (created ? `/checkout/${created.id}` : null), [created]);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    setCreated(null);

    try {
      const token = localStorage.getItem('owner_token');
      if (!token) {
        router.replace('/owners/login');
        return;
      }

      const payload = {
        title: title.trim(),
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        startsAt: new Date(startsAt).toISOString(),
        priceCents,
        currency: 'USD',
      };

      const game = await ownerApi<CreatedGame>('/api/owners/games', token, payload);
      setCreated(game);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op (clipboard may be unavailable)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <Card data-testid="card-create-game">
          <CardHeader>
            <CardTitle>Create Game</CardTitle>
            <CardDescription>Create a game and get a keyword + QR to distribute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form data-testid="form-create-game" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-1">
                <Label htmlFor="title">Title</Label>
                <Input id="title" data-testid="input-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="homeTeam">Home Team</Label>
                  <Input id="homeTeam" data-testid="input-homeTeam" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="awayTeam">Away Team</Label>
                  <Input id="awayTeam" data-testid="input-awayTeam" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="startsAt">Start time</Label>
                  <Input
                    id="startsAt"
                    data-testid="input-startsAt"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="priceCents">Price (cents)</Label>
                  <Input
                    id="priceCents"
                    data-testid="input-priceCents"
                    type="number"
                    min={0}
                    value={priceCents}
                    onChange={(e) => setPriceCents(Number(e.target.value))}
                  />
                  <div className="text-xs text-muted-foreground" data-testid="text-price-preview">
                    {centsToUsd(priceCents)}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                data-testid="btn-submit-create-game"
                onClick={handleCreate}
                disabled={loading}
                data-loading={loading}
                aria-label="Create game"
              >
                {loading ? 'Creating…' : 'Create Game'}
              </Button>
            </form>

            {error && (
              <div role="alert" data-testid="error-create-game" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {created && (
              <div className="space-y-3" data-testid="card-game-created">
                <div className="rounded-md border p-3">
                  <div className="font-semibold">Created</div>
                  <div className="text-sm text-muted-foreground break-all" data-testid="text-game-id">
                    Game ID: {created.id}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <div className="font-semibold">Keyword</div>
                    <div className="text-sm break-all" data-testid="text-keyword-code">
                      {created.keywordCode}
                    </div>
                    <Button type="button" variant="outline" data-testid="btn-copy-keyword" onClick={() => copy(created.keywordCode)}>
                      Copy
                    </Button>
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="font-semibold">QR URL</div>
                    <div className="text-sm break-all" data-testid="text-qr-url">
                      {created.qrUrl}
                    </div>
                    <Button type="button" variant="outline" data-testid="btn-copy-qr" onClick={() => copy(created.qrUrl)}>
                      Copy
                    </Button>
                  </div>
                </div>

                {checkoutLink && (
                  <div className="rounded-md border p-3">
                    <div className="font-semibold">Checkout link (if price > 0)</div>
                    <div className="text-sm break-all" data-testid="text-checkout-link">
                      <a className="underline" href={checkoutLink}>
                        {checkoutLink}
                      </a>
                    </div>
                    <Button type="button" variant="outline" data-testid="btn-copy-checkout-link" onClick={() => copy(checkoutLink)}>
                      Copy
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" data-testid="btn-back-dashboard" onClick={() => router.push('/owners/dashboard')}>
                Back to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


