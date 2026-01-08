'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient, ApiError, type Game, type CouponValidationResponse } from '@/lib/api-client';
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

// Form schema: email required, phone optional (E.164), coupon optional
const checkoutSchema = z.object({
  viewerEmail: z.string().email('Please enter a valid email address'),
  viewerPhone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +1234567890)')
    .optional()
    .or(z.literal('')),
  couponCode: z.string().max(20).optional().or(z.literal('')),
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

  // Coupon state
  const [showCouponField, setShowCouponField] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      viewerEmail: '',
      viewerPhone: '',
      couponCode: '',
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

  // Validate coupon code
  async function handleValidateCoupon() {
    if (!couponInput.trim() || !game) return;

    setValidatingCoupon(true);
    setCouponError(null);

    try {
      const result = await apiClient.validateCoupon({
        code: couponInput.trim().toUpperCase(),
        gameId,
        viewerEmail: form.getValues('viewerEmail') || 'anonymous@temp.com',
      });

      if (result.valid) {
        setAppliedCoupon(result);
        form.setValue('couponCode', couponInput.trim().toUpperCase());
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(result.error || 'Invalid coupon code');
        form.setValue('couponCode', '');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setCouponError(err.message);
      } else {
        setCouponError('Failed to validate coupon');
      }
      setAppliedCoupon(null);
      form.setValue('couponCode', '');
    } finally {
      setValidatingCoupon(false);
    }
  }

  // Remove applied coupon
  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    form.setValue('couponCode', '');
  }

  // Calculate final price
  function getFinalPrice(): number {
    if (!game) return 0;
    if (appliedCoupon?.valid && appliedCoupon.discountCents) {
      return Math.max(0, game.priceCents - appliedCoupon.discountCents);
    }
    return game.priceCents;
  }

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
        couponCode: appliedCoupon?.valid ? data.couponCode : undefined,
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
                <div className="text-right">
                  {appliedCoupon?.valid && appliedCoupon.discountCents ? (
                    <>
                      <span className="text-sm line-through text-muted-foreground mr-2">
                        {formatPrice(game.priceCents, game.currency)}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-primary">
                        {formatPrice(getFinalPrice(), game.currency)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {formatPrice(game.priceCents, game.currency)}
                    </span>
                  )}
                </div>
              </div>
              {appliedCoupon?.valid && appliedCoupon.discountCents && (
                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                  <span>Discount ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : 'applied'})</span>
                  <span>-{formatPrice(appliedCoupon.discountCents, game.currency)}</span>
                </div>
              )}
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

                {/* Coupon Code Section */}
                <div className="space-y-2">
                  {!showCouponField && !appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => setShowCouponField(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Have a promo code?
                    </button>
                  ) : appliedCoupon?.valid ? (
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Code "{form.getValues('couponCode')}" applied
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-sm text-green-600 dark:text-green-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">Promo Code</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter code"
                          className="h-11 sm:h-12 text-base uppercase"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          maxLength={20}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleValidateCoupon}
                          disabled={validatingCoupon || !couponInput.trim()}
                          className="h-11 sm:h-12 px-4"
                        >
                          {validatingCoupon ? 'Checking...' : 'Apply'}
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-sm text-destructive">{couponError}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowCouponField(false);
                          setCouponInput('');
                          setCouponError(null);
                        }}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

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
                  {submitting ? 'Processing...' : `Continue to Payment - ${formatPrice(getFinalPrice(), game.currency)}`}
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
