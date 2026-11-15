'use client';

/**
 * Owner portal — Streaming providers.
 *
 * Connect a camera platform (Veo, …) so the stream admin's "Find live stream"
 * button and the scheduled sync can pull in live stream links. The form for each
 * provider is described by the API, so a new provider needs no change here.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient, type CameraProviderConnection, type CameraProviderInfo } from '@/lib/api-client';

function getOwnerToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('owner_token');
}

function statusLabel(connection: CameraProviderConnection | null): string {
  if (!connection) return 'Not connected';
  return connection.status === 'needs_reconnect' ? 'Needs reconnecting' : 'Connected';
}

/** Start each field from the saved, non-secret settings. Passwords always start empty. */
function initialValues(provider: CameraProviderInfo): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of provider.connectFields) {
    const saved = provider.connection?.config[field.name];
    values[field.name] = field.type !== 'password' && typeof saved === 'string' ? saved : '';
  }
  return values;
}

function withoutPasswords(provider: CameraProviderInfo, values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  for (const field of provider.connectFields) {
    if (field.type === 'password') next[field.name] = '';
  }
  return next;
}

interface ProviderCardProps {
  provider: CameraProviderInfo;
  onChange: (connection: CameraProviderConnection | null) => void;
}

function ProviderCard({ provider, onChange }: ProviderCardProps) {
  const { id, displayName, connection } = provider;
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(provider));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getOwnerToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    setJustConnected(false);
    try {
      const result = await apiClient.ownerCameraSourceConnect(token, id, values);
      onChange(result.connection);
      setJustConnected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not connect ${displayName}`);
    } finally {
      // Never keep a typed password around, whether it worked or not.
      setValues((current) => withoutPasswords(provider, current));
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    const token = getOwnerToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.ownerCameraSourceDisconnect(token, id);
      onChange(null);
      setValues(Object.fromEntries(provider.connectFields.map((field) => [field.name, ''])));
      setJustConnected(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not disconnect ${displayName}`);
    } finally {
      setConfirmingDisconnect(false);
      setBusy(false);
    }
  }

  return (
    <Card data-testid={`card-provider-${id}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{displayName}</CardTitle>
          <span
            data-testid={`status-provider-${id}`}
            data-status={connection?.status ?? 'not_connected'}
            className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
          >
            {statusLabel(connection)}
          </span>
        </div>
        <CardDescription>
          FieldView signs in to {displayName} once to get a session, stores that session encrypted, and does not keep
          your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection?.status === 'needs_reconnect' && (
          <div
            data-testid={`notice-reconnect-${id}`}
            role="status"
            className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 text-sm"
          >
            The {displayName} session has ended. Enter your password to reconnect; until then live streams cannot be
            found.
          </div>
        )}

        {justConnected && connection?.status === 'active' && (
          <div
            data-testid={`notice-connected-${id}`}
            role="status"
            className="rounded-lg bg-green-50 border border-green-200 p-3 text-green-800 text-sm"
          >
            {displayName} is connected. Use “Find live stream” on a stream&apos;s admin panel to pull in a live link.
          </div>
        )}

        <form onSubmit={(event) => void handleConnect(event)} className="space-y-4" data-testid={`form-connect-${id}`}>
          {provider.connectFields.map((field) => {
            const inputId = `${id}-${field.name}`;
            const helpId = field.help ? `${inputId}-help` : undefined;
            return (
              <div key={field.name} className="space-y-1">
                <label htmlFor={inputId} className="text-sm font-medium">
                  {field.label}
                </label>
                <Input
                  id={inputId}
                  name={field.name}
                  type={field.type}
                  value={values[field.name] ?? ''}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  placeholder={field.placeholder}
                  autoComplete={field.type === 'password' ? 'off' : undefined}
                  aria-describedby={helpId}
                  required
                  disabled={busy}
                  data-testid={`input-${id}-${field.name}`}
                />
                {field.help && (
                  <p id={helpId} className="text-xs text-muted-foreground">
                    {field.help}
                  </p>
                )}
              </div>
            );
          })}

          {error && (
            <p role="alert" data-testid={`error-connect-${id}`} className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy} data-loading={busy} data-testid={`btn-connect-${id}`}>
              {busy ? 'Working…' : `${connection ? 'Reconnect' : 'Connect'} ${displayName}`}
            </Button>
            {connection && !confirmingDisconnect && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmingDisconnect(true)}
                data-testid={`btn-disconnect-${id}`}
              >
                Disconnect
              </Button>
            )}
          </div>
        </form>

        {connection && confirmingDisconnect && (
          <div
            data-testid={`confirm-disconnect-${id}`}
            role="group"
            aria-label={`Disconnect ${displayName}`}
            className="rounded-lg border p-3 space-y-2"
          >
            <p className="text-sm">
              Disconnect {displayName}? FieldView will delete the stored session. You will need your password to connect
              again.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => void handleDisconnect()}
                data-testid={`btn-confirm-disconnect-${id}`}
              >
                Disconnect {displayName}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmingDisconnect(false)}
                data-testid={`btn-cancel-disconnect-${id}`}
              >
                Keep connected
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OwnerCameraSourcesPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<CameraProviderInfo[]>([]);

  const fetchProviders = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiClient.ownerCameraSources(token);
      setProviders(data.providers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load streaming providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('owner_token');
    const expires = localStorage.getItem('owner_token_expires');
    if (!token || (expires && new Date(expires) < new Date())) {
      router.replace('/owners/login');
      return;
    }
    setAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (authenticated) void fetchProviders();
  }, [authenticated, fetchProviders]);

  function logout() {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_token_expires');
    router.push('/owners/login');
  }

  function setConnection(providerId: string, connection: CameraProviderConnection | null) {
    setProviders((current) => current.map((p) => (p.id === providerId ? { ...p, connection } : p)));
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Streaming providers</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Connect your camera platform so live stream links can be pulled into your games
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/owners/dashboard')} data-testid="link-dashboard">
                Dashboard
              </Button>
              <Button variant="outline" onClick={logout} aria-label="Sign out" className="shrink-0" data-testid="btn-logout">
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} data-testid="camera-sources-error" />}

        {loading ? (
          <div className="text-center py-12" data-testid="loading-camera-sources">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading streaming providers…</p>
          </div>
        ) : providers.length === 0 && !error ? (
          <p className="text-sm text-muted-foreground" data-testid="empty-providers">
            No streaming providers are available yet.
          </p>
        ) : (
          providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onChange={(connection) => setConnection(provider.id, connection)}
            />
          ))
        )}
      </main>
    </div>
  );
}
