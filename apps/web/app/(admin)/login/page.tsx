'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiClient, ApiError } from '@/lib/api-client';
import { setAdminSessionToken, getAdminSessionToken } from '@/lib/admin-session';
import { dataEventBus, DataEvents } from '@/lib/event-bus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().optional(),
});

type LoginValues = z.infer<typeof LoginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
      mfaToken: '',
    },
  });

  useEffect(() => {
    const existing = getAdminSessionToken();
    if (existing) router.replace('/console');
  }, [router]);

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      const resp = await apiClient.adminLogin({
        email: values.email,
        password: values.password,
        mfaToken: values.mfaToken || undefined,
      });

      if (resp.mfaRequired) {
        setMfaRequired(true);
        setError('MFA token required.');
        return;
      }

      setAdminSessionToken(resp.sessionToken);
      dataEventBus.emit(DataEvents.USER_UPDATED, { kind: 'admin', adminAccount: resp.adminAccount });
      router.push('/console');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Login failed.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>SupportAdmin / SuperAdmin access</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} />
            </div>
            {mfaRequired && (
              <div className="space-y-1">
                <Label htmlFor="mfaToken">MFA Token</Label>
                <Input id="mfaToken" inputMode="numeric" placeholder="123456" {...form.register('mfaToken')} />
              </div>
            )}
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</div>}
            <Button type="submit" className="w-full" aria-label="Sign in">
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          MFA setup/verification will be exposed in-console next.
        </CardFooter>
      </Card>
    </div>
  );
}


