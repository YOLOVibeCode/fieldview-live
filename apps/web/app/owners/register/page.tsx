'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AbuseDetectedModal, type AbuseMessage } from '@/components/v2/AbuseDetectedModal';
import { generateFingerprint } from '@/lib/fingerprint';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['individual', 'association']).default('individual'),
});

type RegisterValues = z.infer<typeof RegisterSchema>;

interface AbuseCheckResult {
  allowed: boolean;
  linkedAccountCount: number;
  abuseDetected: boolean;
  oneTimePassAvailable: boolean;
  message: AbuseMessage | 'none';
}

export default function OwnerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  
  // Abuse detection state
  const [abuseModalOpen, setAbuseModalOpen] = useState(false);
  const [abuseResult, setAbuseResult] = useState<AbuseCheckResult | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<RegisterValues | null>(null);
  const [abusePassAccepted, setAbusePassAccepted] = useState(false);

  // Generate fingerprint on mount
  useEffect(() => {
    generateFingerprint().then(setFingerprint);
  }, []);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      type: 'individual',
    },
  });

  /**
   * Check for abuse before registration
   */
  async function checkAbuse(email: string): Promise<AbuseCheckResult | null> {
    if (!fingerprint) return null;

    try {
      const response = await fetch(`${API_URL}/api/owners/check-abuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprintHash: fingerprint,
          email,
        }),
      });

      if (!response.ok) {
        // If endpoint doesn't exist yet, allow registration
        return null;
      }

      return (await response.json()) as AbuseCheckResult;
    } catch {
      // Allow registration if check fails
      return null;
    }
  }

  /**
   * Execute registration API call
   */
  async function executeRegistration(values: RegisterValues, useOneTimePass: boolean = false) {
    const response = await fetch(`${API_URL}/api/owners/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        fingerprintHash: fingerprint,
        useOneTimePass,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(body?.error?.message || 'Registration failed.');
    }

    const data = (await response.json()) as { token: { token: string; expiresAt: string } };
    localStorage.setItem('owner_token', data.token.token);
    localStorage.setItem('owner_token_expires', data.token.expiresAt);
    router.push('/owners/dashboard');
  }

  /**
   * Handle form submission
   */
  async function onSubmit(values: RegisterValues) {
    setError(null);
    setLoading(true);

    try {
      // Skip abuse check if pass already accepted
      if (!abusePassAccepted) {
        const abuse = await checkAbuse(values.email);

        if (abuse && abuse.abuseDetected) {
          // Show abuse modal
          setAbuseResult(abuse);
          setPendingRegistration(values);
          setAbuseModalOpen(true);
          setLoading(false);
          return;
        }

        // Show warning for first duplicate (but allow)
        if (abuse && abuse.message === 'first_warning') {
          setAbuseResult(abuse);
          setPendingRegistration(values);
          setAbuseModalOpen(true);
          setLoading(false);
          return;
        }
      }

      // Proceed with registration
      await executeRegistration(values, abusePassAccepted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle one-time pass acceptance
   */
  async function handleAcceptPass() {
    setAbuseModalOpen(false);
    setAbusePassAccepted(true);

    if (pendingRegistration) {
      setLoading(true);
      try {
        await executeRegistration(pendingRegistration, true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <>
      {/* Abuse Detection Modal */}
      {abuseResult && (
        <AbuseDetectedModal
          isOpen={abuseModalOpen}
          onClose={() => setAbuseModalOpen(false)}
          onAcceptPass={handleAcceptPass}
          message={abuseResult.message as AbuseMessage}
          linkedAccountCount={abuseResult.linkedAccountCount}
          oneTimePassAvailable={abuseResult.oneTimePassAvailable}
        />
      )}

      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 gradient-primary">
        <Card className="w-full max-w-md shadow-lg" data-testid="card-owner-register">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
          <CardDescription className="text-sm sm:text-base">Get started with FieldView.Live</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="form-owner-register">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm sm:text-base">Name</Label>
              <Input
                id="name"
                className="h-11 sm:h-12 text-base"
                autoComplete="name"
                data-testid="input-name"
                {...form.register('name')}
                aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
              />
              {form.formState.errors.name && (
                <span id="name-error" data-testid="error-name" role="alert" className="text-xs sm:text-sm text-destructive">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="email"
                type="email"
                className="h-11 sm:h-12 text-base"
                autoComplete="email"
                data-testid="input-email"
                {...form.register('email')}
                aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
              />
              {form.formState.errors.email && (
                <span id="email-error" data-testid="error-email" role="alert" className="text-xs sm:text-sm text-destructive">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
              <Input
                id="password"
                type="password"
                className="h-11 sm:h-12 text-base"
                autoComplete="new-password"
                data-testid="input-password"
                {...form.register('password')}
                aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
              />
              {form.formState.errors.password && (
                <span id="password-error" data-testid="error-password" role="alert" className="text-xs sm:text-sm text-destructive">
                  {form.formState.errors.password.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm sm:text-base">Account type</Label>
              <select
                id="type"
                data-testid="dropdown-type"
                className="w-full h-11 sm:h-12 rounded-md border bg-background px-3 py-2 text-base"
                value={form.watch('type')}
                onChange={(e) => form.setValue('type', e.target.value as RegisterValues['type'])}
              >
                <option value="individual">Individual</option>
                <option value="association">Association</option>
              </select>
            </div>

            {error && (
              <div role="alert" data-testid="error-form" className="rounded-lg bg-destructive/10 p-3 sm:p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 sm:h-12 text-base font-semibold"
              size="lg"
              data-testid="btn-submit-register"
              data-loading={loading}
              disabled={loading}
              aria-label="Submit owner registration"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm sm:text-base text-muted-foreground text-center pt-2">
          <a href="/owners/login" className="text-primary font-medium hover:underline" data-testid="link-login">
            ← Back to login
          </a>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}


