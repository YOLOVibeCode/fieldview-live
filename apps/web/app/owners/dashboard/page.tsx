'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('owner_token');
    const expires = localStorage.getItem('owner_token_expires');

    if (!token || !expires) {
      router.replace('/owners/login');
      return;
    }

    if (new Date(expires) < new Date()) {
      localStorage.removeItem('owner_token');
      localStorage.removeItem('owner_token_expires');
      router.replace('/owners/login');
      return;
    }

    setAuthenticated(true);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_token_expires');
    router.push('/owners/login');
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Owner Dashboard</h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="btn-logout"
            aria-label="Logout"
          >
            Logout
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-games">
            <CardHeader>
              <CardTitle>Games</CardTitle>
              <CardDescription>Manage your live streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <a
                  href="/owners/games/new"
                  className="text-primary underline"
                  data-testid="link-create-game"
                >
                  Create a game →
                </a>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-watch-links">
            <CardHeader>
              <CardTitle>Watch Links</CardTitle>
              <CardDescription>Stable URLs for your streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <a
                  href="/owners/watch-links/new"
                  className="text-primary underline"
                  data-testid="link-create-watch-link"
                >
                  Create a stable watch link →
                </a>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-analytics">
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>View your earnings and audience</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

