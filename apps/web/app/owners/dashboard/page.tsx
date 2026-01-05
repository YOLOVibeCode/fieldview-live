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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm sm:text-base text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Owner Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your streams and watch links</p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              data-testid="btn-logout"
              aria-label="Logout"
              className="shrink-0"
            >
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="card-interactive" data-testid="card-games">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Games</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your live streams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                href="/owners/games/new"
                className="inline-flex items-center gap-1 text-sm sm:text-base text-primary font-medium hover:underline"
                data-testid="link-create-game"
              >
                Create a game
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </CardContent>
          </Card>

          <Card className="card-interactive" data-testid="card-watch-links">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Watch Links</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Stable URLs for your streams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                href="/owners/watch-links/new"
                className="inline-flex items-center gap-1 text-sm sm:text-base text-primary font-medium hover:underline"
                data-testid="link-create-watch-link"
              >
                Create a watch link
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </CardContent>
          </Card>

          <Card className="card-interactive" data-testid="card-coach">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Coach Dashboard</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage events and teams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                href="/owners/coach"
                className="inline-flex items-center gap-1 text-sm sm:text-base text-primary font-medium hover:underline"
                data-testid="link-coach-dashboard"
              >
                Open dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </CardContent>
          </Card>

          <Card className="card-interactive" data-testid="card-analytics">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg text-muted-foreground">Analytics</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">View your earnings and audience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Coming soon
              </span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

