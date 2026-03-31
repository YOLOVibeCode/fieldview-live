'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient, ApiError } from '@/lib/api-client';
import { getAdminSessionToken, clearAdminSessionToken } from '@/lib/admin-session';

export default function AdminMfaSetupPage() {
  const router = useRouter();
  const sessionToken = useMemo(() => getAdminSessionToken(), []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 state
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!sessionToken) router.replace('/login');
  }, [router, sessionToken]);

  async function handleSetup() {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.adminMfaSetup(sessionToken);
      setSecret(resp.secret);
      setQrCodeUrl(resp.qrCodeUrl);
      setStep(2);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Failed to set up MFA');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!sessionToken) return;
    setVerifying(true);
    setError(null);
    try {
      await apiClient.adminMfaVerify(sessionToken, { token: mfaToken.trim() });
      setStep(3);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Invalid MFA token. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  function logout() {
    clearAdminSessionToken();
    router.push('/login');
  }

  if (!sessionToken) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">MFA Setup</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Enable two-factor authentication</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/console')}>Console</Button>
              <Button variant="outline" onClick={logout} aria-label="Sign out" className="shrink-0">
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-md px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Enable MFA</CardTitle>
              <CardDescription>
                Add an extra layer of security to your admin account using a TOTP authenticator app (Google Authenticator, Authy, 1Password, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSetup} disabled={loading} className="w-full">
                {loading ? 'Setting up…' : 'Set Up MFA'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Scan QR Code</CardTitle>
              <CardDescription>
                Open your authenticator app and scan this QR code. Then enter the 6-digit code to verify.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {qrCodeUrl && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48 rounded-lg border" />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Manual entry key</Label>
                <div className="p-2 bg-muted rounded font-mono text-xs break-all select-all">{secret}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-token">Verification Code</Label>
                <Input
                  id="mfa-token"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              <Button onClick={handleVerify} disabled={verifying || mfaToken.length !== 6} className="w-full">
                {verifying ? 'Verifying…' : 'Verify & Enable MFA'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-green-600">MFA Enabled</CardTitle>
              <CardDescription>
                Two-factor authentication is now active on your account. You will need your authenticator app to log in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/console')} className="w-full">
                Return to Console
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
