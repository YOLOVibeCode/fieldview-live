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
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Admin Login</CardTitle>
          <CardDescription className="text-sm sm:text-base">SupportAdmin / SuperAdmin access</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input 
                id="email" 
                type="email" 
                className="h-11 sm:h-12 text-base"
                autoComplete="email"
                {...form.register('email')} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
              <Input 
                id="password" 
                type="password" 
                className="h-11 sm:h-12 text-base"
                autoComplete="current-password"
                {...form.register('password')} 
              />
            </div>
            {mfaRequired && (
              <div className="space-y-2">
                <Label htmlFor="mfaToken" className="text-sm sm:text-base">MFA Token</Label>
                <Input 
                  id="mfaToken" 
                  inputMode="numeric" 
                  placeholder="123456" 
                  className="h-11 sm:h-12 text-base text-center tracking-widest"
                  {...form.register('mfaToken')} 
                />
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 sm:p-4 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11 sm:h-12 text-base font-semibold" size="lg" aria-label="Sign in">
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs sm:text-sm text-muted-foreground text-center pt-2">
          MFA setup/verification will be exposed in-console next.
        </CardFooter>
      </Card>
    </div>
  );
}


