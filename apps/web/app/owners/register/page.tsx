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

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['individual', 'association']).default('individual'),
});

type RegisterValues = z.infer<typeof RegisterSchema>;

export default function OwnerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      type: 'individual',
    },
  });

  async function onSubmit(values: RegisterValues) {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/owners/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || 'Registration failed.');
      }

      const data = (await response.json()) as { token: { token: string; expiresAt: string } };
      localStorage.setItem('owner_token', data.token.token);
      localStorage.setItem('owner_token_expires', data.token.expiresAt);
      router.push('/owners/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md" data-testid="card-owner-register">
        <CardHeader>
          <CardTitle>Owner Register</CardTitle>
          <CardDescription>Create an account to manage games and watch links</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="form-owner-register">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                data-testid="input-name"
                {...form.register('name')}
                aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
              />
              {form.formState.errors.name && (
                <span id="name-error" data-testid="error-name" role="alert" className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                {...form.register('email')}
                aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
              />
              {form.formState.errors.email && (
                <span id="email-error" data-testid="error-email" role="alert" className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                {...form.register('password')}
                aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
              />
              {form.formState.errors.password && (
                <span id="password-error" data-testid="error-password" role="alert" className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="type">Account type</Label>
              <select
                id="type"
                data-testid="dropdown-type"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.watch('type')}
                onChange={(e) => form.setValue('type', e.target.value as RegisterValues['type'])}
              >
                <option value="individual">Individual</option>
                <option value="association">Association</option>
              </select>
            </div>

            {error && (
              <div role="alert" data-testid="error-form" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              data-testid="btn-submit-register"
              data-loading={loading}
              disabled={loading}
              aria-label="Submit owner registration"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <a href="/owners/login" className="text-primary underline" data-testid="link-login">
            Back to login
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}


