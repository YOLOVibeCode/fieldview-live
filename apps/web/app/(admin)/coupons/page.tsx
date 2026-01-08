'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  apiClient,
  ApiError,
  type CouponCode,
  type CouponListResponse,
  type CreateCouponRequest,
} from '@/lib/api-client';
import { clearAdminSessionToken, getAdminSessionToken } from '@/lib/admin-session';
import { dataEventBus, DataEvents } from '@/lib/event-bus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function formatDiscount(coupon: CouponCode): string {
  if (coupon.discountType === 'percentage') {
    return `${coupon.discountValue}%`;
  }
  return formatCents(coupon.discountValue);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CouponsPage() {
  const router = useRouter();
  const sessionToken = useMemo(() => getAdminSessionToken(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<CouponListResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create form state
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_cents'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [validTo, setValidTo] = useState('');

  useEffect(() => {
    if (!sessionToken) {
      router.replace('/login');
      return;
    }

    fetchCoupons();
  }, [router, sessionToken]);

  async function fetchCoupons() {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.adminListCoupons(sessionToken);
      setCoupons(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) return;

    setCreating(true);
    setCreateError(null);

    try {
      const data: CreateCouponRequest = {
        code: newCode.toUpperCase(),
        discountType,
        discountValue:
          discountType === 'percentage'
            ? parseInt(discountValue, 10)
            : Math.round(parseFloat(discountValue) * 100),
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        validTo: validTo || null,
      };

      await apiClient.adminCreateCoupon(sessionToken, data);

      // Reset form and close modal
      setNewCode('');
      setDiscountValue('');
      setMaxUses('');
      setValidTo('');
      setShowCreateModal(false);

      // Refresh list
      fetchCoupons();
    } catch (err) {
      if (err instanceof ApiError) setCreateError(err.message);
      else setCreateError('Failed to create coupon.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDisableCoupon(couponId: string) {
    if (!sessionToken) return;
    try {
      await apiClient.adminDeleteCoupon(sessionToken, couponId);
      fetchCoupons();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  function logout() {
    clearAdminSessionToken();
    dataEventBus.emit(DataEvents.USER_UPDATED, { kind: 'admin', adminAccount: null });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Coupon Codes</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Create and manage discount codes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/console">
                <Button variant="ghost" size="sm">Console</Button>
              </Link>
              <Link href="/revenue">
                <Button variant="ghost" size="sm">Revenue</Button>
              </Link>
              <Button variant="outline" onClick={logout} aria-label="Sign out" className="shrink-0">
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Create Button */}
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateModal(true)}>Create Coupon</Button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading coupons...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {coupons && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">All Coupons</CardTitle>
              <CardDescription>{coupons.total} total coupon{coupons.total !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              {coupons.coupons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No coupons created yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">Code</th>
                        <th className="text-right py-2 px-2 font-medium">Discount</th>
                        <th className="text-right py-2 px-2 font-medium">Used</th>
                        <th className="text-left py-2 px-2 font-medium">Expires</th>
                        <th className="text-left py-2 px-2 font-medium">Status</th>
                        <th className="text-right py-2 px-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.coupons.map((coupon, idx) => (
                        <tr key={coupon.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                          <td className="py-2 px-2 font-mono font-medium">{coupon.code}</td>
                          <td className="text-right py-2 px-2">{formatDiscount(coupon)}</td>
                          <td className="text-right py-2 px-2">
                            {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                          </td>
                          <td className="py-2 px-2">{formatDate(coupon.validTo)}</td>
                          <td className="py-2 px-2">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                coupon.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {coupon.status}
                            </span>
                          </td>
                          <td className="text-right py-2 px-2">
                            {coupon.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDisableCoupon(coupon.id)}
                              >
                                Disable
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create Coupon</CardTitle>
                <CardDescription>Create a new discount code</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Coupon Code</Label>
                    <Input
                      id="code"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="e.g., SAVE10"
                      pattern="[A-Z0-9]+"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discountType">Discount Type</Label>
                      <select
                        id="discountType"
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed_cents')}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed_cents">Fixed Amount</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        {discountType === 'percentage' ? 'Percent Off' : 'Amount Off ($)'}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        min="0"
                        step={discountType === 'percentage' ? '1' : '0.01'}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'percentage' ? '10' : '5.00'}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Max Uses (optional)</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        min="1"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validTo">Expires (optional)</Label>
                      <Input
                        id="validTo"
                        type="date"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                      />
                    </div>
                  </div>

                  {createError && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {createError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowCreateModal(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Coupon'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
