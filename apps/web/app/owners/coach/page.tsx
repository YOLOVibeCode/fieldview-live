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
import { apiRequest } from '@/lib/api-client';
import { getUserFriendlyMessage } from '@/lib/error-messages';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

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

      const membershipsData = await apiRequest<{ memberships: Membership[] }>(
        '/api/owners/me/memberships',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          retries: 1,
        }
      );
      setMemberships(membershipsData.memberships || []);

      // Load channels from owner's orgs
      const orgsResp = await apiRequest<{
        orgs: Array<{
          id: string;
          shortName: string;
          name: string;
          channels: Array<{ id: string; teamSlug: string; displayName: string }>;
        }>;
      }>('/api/owners/me/watch-links/orgs', {
        headers: { Authorization: `Bearer ${token}` },
        retries: 1,
      });
      const loadedChannels: Channel[] = (orgsResp.orgs || []).flatMap((o) =>
        o.channels.map((ch) => ({ id: ch.id, teamSlug: ch.teamSlug, displayName: ch.displayName, organizationId: o.id }))
      );
      setChannels(loadedChannels);

      // Load events
      const eventsResp = await apiRequest<{
        events: Array<{
          id: string;
          canonicalPath: string;
          startsAt: string;
          state: 'scheduled' | 'live' | 'ended' | 'cancelled';
          channelId: string;
        }>;
      }>('/api/owners/me/events', {
        headers: { Authorization: `Bearer ${token}` },
        retries: 1,
      });
      setEvents(eventsResp.events || []);
    } catch (err) {
      setError(getUserFriendlyMessage(err));
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
          <ErrorBanner message={error} onDismiss={() => setError(null)} data-testid="error-message" />
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
                      {channels.filter((c) => c.organizationId === membership.organizationId).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No teams configured yet</p>
                      ) : (
                        <div className="space-y-1">
                          {channels
                            .filter((c) => c.organizationId === membership.organizationId)
                            .map((ch) => (
                              <div key={ch.id} className="text-sm p-2 bg-muted/50 rounded flex items-center justify-between">
                                <span>{ch.displayName} <span className="text-muted-foreground font-mono text-xs">({ch.teamSlug})</span></span>
                              </div>
                            ))}
                        </div>
                      )}
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

