/**
 * Reusable Viewer Unlock Form
 * 
 * Universal unlock UI for any game/stream type.
 * Remembers user info in localStorage for convenience.
 * 
 * Usage:
 * ```tsx
 * <ViewerUnlockForm
 *   onUnlock={async (data) => {
 *     await viewer.unlock(data);
 *   }}
 *   isLoading={viewer.isLoading}
 *   error={viewer.error}
 * />
 * ```
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const unlockSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
});

type UnlockFormValues = z.infer<typeof unlockSchema>;

interface ViewerUnlockFormProps {
  onUnlock: (data: UnlockFormValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

const STORAGE_KEY = 'fieldview_viewer_unlock_draft';

function getSavedData(): Partial<UnlockFormValues> {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function ViewerUnlockForm({
  onUnlock,
  isLoading = false,
  error = null,
  title = 'Enter Your Info to Watch',
  description = 'We\'ll remember this for next time',
}: ViewerUnlockFormProps) {
  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockSchema),
    defaultValues: getSavedData(),
  });

  // Auto-save to localStorage
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (data: UnlockFormValues) => {
    try {
      await onUnlock(data);
      // Clear draft on success
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      // Error is handled by parent
    }
  };

  return (
    <Card className="max-w-md mx-auto glass border border-primary/20 shadow-elevation-2" data-testid="card-viewer-unlock">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
        {description && <CardDescription className="text-sm sm:text-base">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            data-testid="form-viewer-unlock"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Email</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="min-h-[44px] text-base"
                      aria-label="Email address"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage data-testid="error-email" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">First Name</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-first-name"
                        placeholder="John"
                        autoComplete="given-name"
                        className="min-h-[44px] text-base"
                        aria-label="First name"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-first-name" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-last-name"
                        placeholder="Doe"
                        autoComplete="family-name"
                        className="min-h-[44px] text-base"
                        aria-label="Last name"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-last-name" />
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div
                data-testid="unlock-error"
                className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm sm:text-base leading-relaxed"
                role="alert"
              >
                {error}
              </div>
            )}

            <Button
              data-testid="btn-unlock-stream"
              type="submit"
              className="w-full min-h-[44px] text-base font-medium active:scale-95 transition-transform"
              disabled={isLoading}
              aria-label={isLoading ? 'Unlocking stream...' : 'Unlock stream'}
            >
              {isLoading ? 'Unlocking...' : 'Unlock Stream'}
            </Button>

            <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
              Your info is only used for chat display (shown as "First L.") and will be remembered on
              this device.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

