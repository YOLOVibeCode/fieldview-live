/**
 * Subscribe Form Component
 *
 * Reusable component for viewers to subscribe to teams/events for notifications.
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';

import { SmsOptInCheckbox } from '@/components/SmsOptInCheckbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

import { apiRequest } from '../lib/api-client';
import { getUserFriendlyMessage } from '../lib/error-messages';
import { parsePhoneToE164 } from '../lib/phone';

const SubscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  phoneE164: z.string().optional().or(z.literal('')),
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
  const [smsOptIn, setSmsOptIn] = useState(false);

  const form = useForm<SubscribeValues>({
    resolver: zodResolver(SubscribeSchema) as Resolver<SubscribeValues>,
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
      const phoneE164: string | undefined = values.phoneE164?.trim()
        ? parsePhoneToE164(values.phoneE164.trim())
        : undefined;
      const wantsSms = values.preference === 'sms' || values.preference === 'both';
      if (wantsSms && !smsOptIn) {
        throw new Error('Check the SMS opt-in box to receive text notifications');
      }

      await apiRequest<{ success: boolean; message: string }>(
        '/api/public/subscriptions',
        {
          method: 'POST',
          body: JSON.stringify({
            email: values.email,
            phoneE164,
            smsOptIn: wantsSms ? smsOptIn : undefined,
            organizationId,
            channelId,
            eventId,
            preference: values.preference,
          }),
        }
      );

      setSuccess(true);
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      setError(getUserFriendlyMessage(err));
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
        <form
          className="space-y-4"
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
          data-testid="form-subscribe"
        >
          {error && (
            <ErrorBanner
              message={error}
              onDismiss={() => setError(null)}
              data-testid="error-subscribe"
            />
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

          {(form.watch('phoneE164')?.trim() ||
            form.watch('preference') === 'sms' ||
            form.watch('preference') === 'both') && (
            <SmsOptInCheckbox checked={smsOptIn} onChange={setSmsOptIn} disabled={loading} />
          )}

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


