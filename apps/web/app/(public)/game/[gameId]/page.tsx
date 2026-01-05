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
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-base sm:text-lg text-muted-foreground">Loading game information...</p>
        </div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <CardTitle className="text-xl">Error</CardTitle>
            <CardDescription className="text-sm sm:text-base">{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/')}>Go Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 lg:py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl sm:text-2xl">Purchase Stream Access</CardTitle>
            <CardDescription className="text-base sm:text-lg font-medium">
              {game.homeTeam} vs {game.awayTeam}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Game Info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-muted-foreground">Teams</span>
                <span className="text-sm sm:text-base font-medium">
                  {game.homeTeam} vs {game.awayTeam}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-muted-foreground">Start Time</span>
                <span className="text-sm sm:text-base font-medium">{formatDateTime(game.startsAt)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-xl sm:text-2xl font-bold text-primary">{formatPrice(game.priceCents, game.currency)}</span>
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
                      <FormLabel className="text-sm sm:text-base">Email Address *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="h-11 sm:h-12 text-base"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
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
                      <FormLabel className="text-sm sm:text-base">Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1234567890"
                          className="h-11 sm:h-12 text-base"
                          autoComplete="tel"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        E.164 format (e.g., +1234567890). Used for SMS notifications.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 sm:p-4 text-sm text-destructive" role="alert">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold" 
                  size="lg"
                  disabled={submitting} 
                  aria-label="Continue to payment"
                >
                  {submitting ? 'Processing...' : `Continue to Payment - ${formatPrice(game.priceCents, game.currency)}`}
                </Button>
                
                <p className="text-xs sm:text-sm text-center text-muted-foreground">
                  Secure payment powered by Square
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
