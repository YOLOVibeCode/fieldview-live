/**
 * Coach Dashboard Page
 *
 * Shows assigned teams/channels and upcoming events for coaches.
 */

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

interface Organization {
  id: string;
  shortName: string;
  name: string;
}

interface Channel {
  id: string;
  teamSlug: string;
  displayName: string;
  organizationId: string;
}

interface Event {
  id: string;
  canonicalPath: string;
  startsAt: string;
  state: 'scheduled' | 'live' | 'ended' | 'cancelled';
  channelId: string;
}

interface Membership {
  id: string;
  organizationId: string;
  role: 'org_admin' | 'team_manager' | 'coach';
  organization: Organization;
}

export default function CoachDashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    void loadData(token);
  }, [router]);

  async function loadData(token: string) {
    try {
      setLoading(true);
      setError(null);

      // Get owner user ID (we'll need to fetch this from a /me endpoint)
      // For now, we'll fetch memberships for all orgs the user has access to
      const membershipsResponse = await fetch(`${API_URL}/api/owners/me/memberships`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!membershipsResponse.ok) {
        throw new Error('Failed to load memberships');
      }

      const membershipsData = (await membershipsResponse.json()) as { memberships: Membership[] };
      setMemberships(membershipsData.memberships || []);

      // Load channels and events for each organization
      const orgIds = membershipsData.memberships?.map((m) => m.organizationId) || [];
      if (orgIds.length > 0) {
        // TODO: Fetch channels and events for these orgs
        // For now, we'll show a placeholder
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Coach Dashboard</h1>
          <Button variant="outline" onClick={handleLogout} data-testid="btn-logout" aria-label="Logout">
            Logout
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md" data-testid="error-message">
            {error}
          </div>
        )}

        {memberships.length === 0 ? (
          <Card data-testid="card-no-teams">
            <CardHeader>
              <CardTitle>No Teams Assigned</CardTitle>
              <CardDescription>You haven&apos;t been assigned to any teams yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Contact your organization admin to get access to teams.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {memberships.map((membership) => (
              <Card key={membership.id} data-testid={`card-org-${membership.organization.shortName}`}>
                <CardHeader>
                  <CardTitle>{membership.organization.name}</CardTitle>
                  <CardDescription>Role: {membership.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Teams</h3>
                      <p className="text-sm text-muted-foreground">Teams will be listed here</p>
                    </div>
                    <div>
                      <Link
                        href={`/owners/events/new?org=${membership.organization.shortName}`}
                        className="text-primary underline"
                        data-testid={`link-create-event-${membership.organization.shortName}`}
                      >
                        Create Event →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Card data-testid="card-upcoming-events">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Your scheduled events</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="p-2 border rounded" data-testid={`event-${event.id}`}>
                      <div className="font-medium">{event.canonicalPath}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.startsAt).toLocaleString()} • {event.state}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

