'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient, ApiError, type Game } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Form schema: email required, phone optional (E.164)
const checkoutSchema = z.object({
  viewerEmail: z.string().email('Please enter a valid email address'),
  viewerPhone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +1234567890)')
    .optional()
    .or(z.literal('')),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      viewerEmail: '',
      viewerPhone: '',
    },
  });

  // Fetch game info
  useEffect(() => {
    async function fetchGame() {
      try {
        const gameData = await apiClient.getGame(gameId);
        setGame(gameData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load game information');
        }
      } finally {
        setLoading(false);
      }
    }

    if (gameId) {
      fetchGame();
    }
  }, [gameId]);

  // Handle form submission
  async function onSubmit(data: CheckoutFormValues) {
    if (!game) return;

    setSubmitting(true);
    setError(null);

    try {
      // Create checkout
      const checkout = await apiClient.createCheckout(gameId, {
        viewerEmail: data.viewerEmail,
        viewerPhone: data.viewerPhone || undefined,
      });

      // Redirect to Square checkout
      // Square Web Payments SDK will handle payment on the next page
      router.push(`/checkout/${checkout.purchaseId}/payment`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create checkout. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Format price
  function formatPrice(cents: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  }

  // Format date/time
  function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading game information...</p>
        </div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Purchase Stream Access</CardTitle>
          <CardDescription>
            {game.homeTeam} vs {game.awayTeam}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Game Info */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Teams:</span>
              <span className="text-sm font-medium">
                {game.homeTeam} vs {game.awayTeam}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Start Time:</span>
              <span className="text-sm font-medium">{formatDateTime(game.startsAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price:</span>
              <span className="text-lg font-bold">{formatPrice(game.priceCents, game.currency)}</span>
            </div>
          </div>

          {/* Checkout Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="viewerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Required for stream access and receipts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="viewerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      E.164 format (e.g., +1234567890). Used for SMS notifications.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Processing...' : `Continue to Payment - ${formatPrice(game.priceCents, game.currency)}`}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
