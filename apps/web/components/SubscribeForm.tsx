/**
 * Subscribe Form Component
 *
 * Reusable component for viewers to subscribe to teams/events for notifications.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

const SubscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  phoneE164: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +1234567890)')
    .optional()
    .or(z.literal('')),
  preference: z.enum(['email', 'sms', 'both']).default('email'),
});

type SubscribeValues = z.infer<typeof SubscribeSchema>;

interface SubscribeFormProps {
  organizationId?: string;
  channelId?: string;
  eventId?: string;
  onSuccess?: () => void;
}

export function SubscribeForm({ organizationId, channelId, eventId, onSuccess }: SubscribeFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<SubscribeValues>({
    resolver: zodResolver(SubscribeSchema),
    defaultValues: {
      email: '',
      phoneE164: '',
      preference: 'email',
    },
  });

  async function onSubmit(values: SubscribeValues) {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/public/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          phoneE164: values.phoneE164 || undefined,
          organizationId,
          channelId,
          eventId,
          preference: values.preference,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || 'Failed to subscribe');
      }

      setSuccess(true);
      form.reset();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card data-testid="card-subscribe-success">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Subscribed!</CardTitle>
          <CardDescription className="text-sm sm:text-base">You&apos;ll be notified when the stream goes live</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-testid="card-subscribe">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Get Notified</CardTitle>
        <CardDescription className="text-sm sm:text-base">Subscribe to be notified when this stream goes live</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="form-subscribe">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm sm:text-base leading-relaxed" data-testid="error-subscribe" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="subscribe-email" className="text-sm sm:text-base">Email</Label>
            <Input
              id="subscribe-email"
              type="email"
              data-testid="input-subscribe-email"
              className="min-h-[44px] text-base"
              aria-describedby={form.formState.errors.email ? 'subscribe-email-error' : undefined}
              aria-label="Email address for notifications"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <span
                id="subscribe-email-error"
                data-testid="error-subscribe-email"
                role="alert"
                className="text-sm text-destructive"
              >
                {form.formState.errors.email.message}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="subscribe-phone" className="text-sm sm:text-base">Phone (Optional)</Label>
            <Input
              id="subscribe-phone"
              type="tel"
              placeholder="+1234567890"
              data-testid="input-subscribe-phone"
              className="min-h-[44px] text-base"
              aria-describedby={form.formState.errors.phoneE164 ? 'subscribe-phone-error' : undefined}
              aria-label="Phone number for SMS notifications"
              {...form.register('phoneE164')}
            />
            {form.formState.errors.phoneE164 && (
              <span
                id="subscribe-phone-error"
                data-testid="error-subscribe-phone"
                role="alert"
                className="text-sm text-destructive"
              >
                {form.formState.errors.phoneE164.message}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="subscribe-preference" className="text-sm sm:text-base">Notification Preference</Label>
            <select
              id="subscribe-preference"
              data-testid="select-subscribe-preference"
              {...form.register('preference')}
              className="w-full min-h-[44px] px-3 py-2 text-base border rounded-md bg-background"
              aria-label="Notification preference"
            >
              <option value="email">Email only</option>
              <option value="sms">SMS only</option>
              <option value="both">Email and SMS</option>
            </select>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            data-testid="btn-subscribe" 
            data-loading={loading}
            className="w-full min-h-[44px] text-base font-medium active:scale-95 transition-transform"
            aria-label={loading ? 'Subscribing...' : 'Subscribe to notifications'}
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


