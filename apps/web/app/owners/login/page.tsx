'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof LoginSchema>;

export default function OwnerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/owners/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || 'Login failed. Please check your credentials.');
      }

      const data = (await response.json()) as { token: { token: string; expiresAt: string } };

      // Store token in localStorage
      localStorage.setItem('owner_token', data.token.token);
      localStorage.setItem('owner_token_expires', data.token.expiresAt);

      // Redirect to dashboard
      router.push('/owners/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 gradient-primary">
      <Card className="w-full max-w-md shadow-lg" data-testid="card-owner-login">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Owner Login</CardTitle>
          <CardDescription className="text-sm sm:text-base">Sign in to manage your games and watch links</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            data-testid="form-login"
          >
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
                autoComplete="current-password"
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

            {error && (
              <div role="alert" data-testid="error-login" className="rounded-lg bg-destructive/10 p-3 sm:p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 sm:h-12 text-base font-semibold"
              size="lg"
              data-testid="btn-submit-login"
              data-loading={loading}
              disabled={loading}
              aria-label="Sign in"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm sm:text-base text-muted-foreground text-center pt-2">
          <p>
            Don&apos;t have an account?{' '}
            <a href="/owners/register" className="text-primary font-medium hover:underline" data-testid="link-register">
              Register
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

