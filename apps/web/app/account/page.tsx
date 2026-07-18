'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGlobalViewerAuth } from '@/hooks/useGlobalViewerAuth';
import { apiRequest } from '@/lib/api-client';
import { getUserFriendlyMessage } from '@/lib/error-messages';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

interface Subscription {
  slug: string;
  title: string;
  scheduledStartAt: string | null;
  subscribedAt: string;
}

interface PurchaseRefund {
  amountCents: number;
  reason: string;
  createdAt: string;
}

interface Purchase {
  id: string;
  streamTitle: string;
  streamSlug: string | null;
  streamLink: string | null;
  amountCents: number;
  currency: string;
  discountCents: number;
  platformFeeCents: number;
  status: string;
  paidAt: string | null;
  refundedAt: string | null;
  cardLastFour: string | null;
  cardBrand: string | null;
  refunds: PurchaseRefund[];
}

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-500/20 text-green-400 border-green-500/30',
    refunded: 'bg-red-500/20 text-red-400 border-red-500/30',
    partially_refunded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  const labels: Record<string, string> = {
    paid: 'Paid',
    refunded: 'Refunded',
    partially_refunded: 'Partial Refund',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
      data-testid={`badge-status-${status}`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const {
    viewerIdentityId,
    viewerEmail,
    viewerFirstName,
    viewerLastName,
    isAuthenticated,
    isLoading: authLoading,
    clearViewerAuth,
    setViewerAuth,
  } = useGlobalViewerAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);

  const [accessLinkSent, setAccessLinkSent] = useState(false);
  const [accessLinkSending, setAccessLinkSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    setFirstName(viewerFirstName || '');
    setLastName(viewerLastName || '');
  }, [viewerFirstName, viewerLastName]);

  useEffect(() => {
    if (!viewerIdentityId) return;
    void (async () => {
      try {
        const data = await apiRequest<{ subscriptions: Subscription[] }>(
          `/api/public/viewer/${viewerIdentityId}/subscriptions`,
          { retries: 1 }
        );
        setSubscriptions(data.subscriptions || []);
      } catch { /* ignore */ } finally {
        setSubsLoading(false);
      }
    })();
  }, [viewerIdentityId]);

  useEffect(() => {
    if (!viewerIdentityId) return;
    void (async () => {
      try {
        const data = await apiRequest<{ purchases: Purchase[] }>(
          `/api/public/viewer/${viewerIdentityId}/purchases`,
          { retries: 1 }
        );
        setPurchases(data.purchases || []);
      } catch { /* ignore */ } finally {
        setPurchasesLoading(false);
      }
    })();
  }, [viewerIdentityId]);

  const handleProfileSave = useCallback(async () => {
    if (!viewerIdentityId || profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await apiRequest<{ success: boolean }>(
        `/api/public/viewer/${viewerIdentityId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
        }
      );
      setProfileSaved(true);
      setProfileDirty(false);
      setViewerAuth({
        viewerIdentityId,
        email: viewerEmail || '',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      setProfileError(getUserFriendlyMessage(error));
    } finally {
      setProfileSaving(false);
    }
  }, [viewerIdentityId, viewerEmail, firstName, lastName, profileSaving, setViewerAuth]);

  const handleUnsubscribe = useCallback(async (slug: string) => {
    if (!viewerIdentityId) return;
    try {
      await apiRequest<{ success: boolean }>(
        `/api/public/direct/${slug}/notify-me`,
        {
          method: 'DELETE',
          body: JSON.stringify({ viewerIdentityId }),
        }
      );
      setSubscriptions((prev) => prev.filter((s) => s.slug !== slug));
    } catch { /* ignore */ }
  }, [viewerIdentityId]);

  const handleSendAccessLink = useCallback(async () => {
    if (!viewerEmail || accessLinkSending) return;
    setAccessLinkSending(true);
    try {
      await apiRequest<{ success: boolean }>(
        '/api/auth/viewer-refresh/request',
        {
          method: 'POST',
          body: JSON.stringify({ email: viewerEmail }),
        }
      );
      setAccessLinkSent(true);
    } catch { /* ignore */ } finally {
      setAccessLinkSending(false);
    }
  }, [viewerEmail, accessLinkSending]);

  const handleSignOut = useCallback(() => {
    clearViewerAuth();
    router.replace('/');
  }, [clearViewerAuth, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isGuest = viewerEmail?.endsWith('@guest.fieldview.live');

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8" data-testid="account-page">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              FieldView.Live
            </h1>
          </Link>
          <h2 className="text-xl font-semibold text-slate-100" data-testid="page-title">My Account</h2>
        </div>

        {/* Section 1: Profile */}
        <section className="bg-slate-900 border border-slate-700 rounded-xl p-6" data-testid="section-profile">
          <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>
          {isGuest ? (
            <p className="text-slate-400 text-sm" data-testid="profile-guest-message">You are signed in as a guest. Register on a stream page to create a full account.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-1">First name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setProfileDirty(true); }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="First name"
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-1">Last name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setProfileDirty(true); }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Last name"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <p className="text-slate-400 text-sm" data-testid="display-email">{viewerEmail}</p>
              </div>
              <div className="flex items-center gap-3">
                {profileDirty && (
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    data-testid="btn-save-profile"
                  >
                    {profileSaving ? 'Saving...' : 'Save'}
                  </button>
                )}
                {profileSaved && <span className="text-green-400 text-sm" data-testid="profile-saved">Saved</span>}
              </div>
              {profileError && <ErrorBanner message={profileError} onDismiss={() => setProfileError(null)} data-testid="error-profile" />}
            </div>
          )}
        </section>

        {/* Section 2: Stream Subscriptions */}
        <section className="bg-slate-900 border border-slate-700 rounded-xl p-6" data-testid="section-subscriptions">
          <h3 className="text-lg font-semibold text-white mb-4">Stream Subscriptions</h3>
          {subsLoading ? (
            <div className="flex justify-center py-6" data-testid="subs-loading">
              <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : subscriptions.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4" data-testid="subs-empty">No active subscriptions</p>
          ) : (
            <ul className="divide-y divide-slate-700" data-testid="subs-list">
              {subscriptions.map((sub) => (
                <li key={sub.slug} className="flex items-center justify-between py-3 gap-3" data-testid={`sub-${sub.slug}`}>
                  <div className="min-w-0">
                    <Link
                      href={`/direct/${sub.slug}`}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium truncate block"
                      data-testid={`link-stream-${sub.slug}`}
                    >
                      {sub.title}
                    </Link>
                    {sub.scheduledStartAt && (
                      <p className="text-slate-500 text-xs mt-0.5">{formatDate(sub.scheduledStartAt)}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnsubscribe(sub.slug)}
                    className="shrink-0 px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 rounded-lg transition-colors"
                    data-testid={`btn-unsub-${sub.slug}`}
                    aria-label={`Unsubscribe from ${sub.title}`}
                  >
                    Unsubscribe
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section 3: Payment History */}
        <section className="bg-slate-900 border border-slate-700 rounded-xl p-6" data-testid="section-payments">
          <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>
          {purchasesLoading ? (
            <div className="flex justify-center py-6" data-testid="payments-loading">
              <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : purchases.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4" data-testid="payments-empty">No purchases yet</p>
          ) : (
            <ul className="divide-y divide-slate-700" data-testid="payments-list">
              {purchases.map((p) => (
                <li key={p.id} data-testid={`purchase-${p.id}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedPurchase(expandedPurchase === p.id ? null : p.id)}
                    className="w-full flex items-center justify-between py-3 gap-3 text-left hover:bg-slate-800/50 transition-colors -mx-2 px-2 rounded-lg"
                    aria-expanded={expandedPurchase === p.id}
                    data-testid={`btn-expand-${p.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.streamLink ? (
                          <Link
                            href={p.streamLink}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium truncate"
                          >
                            {p.streamTitle}
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-sm font-medium truncate">{p.streamTitle}</span>
                        )}
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {p.paidAt && <span>{formatDate(p.paidAt)}</span>}
                        {p.cardBrand && p.cardLastFour && <span>{p.cardBrand} ...{p.cardLastFour}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-white font-medium text-sm" data-testid={`amount-${p.id}`}>
                        {formatCurrency(p.amountCents, p.currency)}
                      </span>
                      <span className="ml-2 text-slate-500 text-xs">{expandedPurchase === p.id ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {expandedPurchase === p.id && (
                    <div className="pb-3 pl-2 pr-2 text-xs text-slate-400 space-y-1" data-testid={`receipt-${p.id}`}>
                      <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
                        <div className="flex justify-between"><span>Amount</span><span className="text-slate-300">{formatCurrency(p.amountCents, p.currency)}</span></div>
                        {p.discountCents > 0 && (
                          <div className="flex justify-between"><span>Discount</span><span className="text-green-400">-{formatCurrency(p.discountCents, p.currency)}</span></div>
                        )}
                        <div className="flex justify-between"><span>Processing fee</span><span className="text-slate-300">{formatCurrency(p.platformFeeCents, p.currency)}</span></div>
                        {p.refunds.length > 0 && (
                          <>
                            <hr className="border-slate-700 my-1" />
                            {p.refunds.map((r, i) => (
                              <div key={i} className="flex justify-between text-red-400">
                                <span>Refund ({r.reason})</span>
                                <span>-{formatCurrency(r.amountCents, p.currency)}</span>
                              </div>
                            ))}
                          </>
                        )}
                        <hr className="border-slate-700 my-1" />
                        <div className="flex justify-between text-slate-500">
                          <span>Purchase ID</span>
                          <span className="font-mono">{p.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section 4: Account Actions */}
        <section className="bg-slate-900 border border-slate-700 rounded-xl p-6" data-testid="section-actions">
          <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
          <div className="space-y-3">
            {!isGuest && (
              <div>
                {accessLinkSent ? (
                  <p className="text-green-400 text-sm" data-testid="access-link-sent">
                    Check your email for a new access link.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendAccessLink}
                    disabled={accessLinkSending}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-lg border border-slate-600 transition-colors"
                    data-testid="btn-send-access-link"
                  >
                    {accessLinkSending ? 'Sending...' : 'Send me a new access link'}
                  </button>
                )}
                <p className="text-slate-500 text-xs mt-1">We&apos;ll email you a link to verify your identity.</p>
              </div>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium rounded-lg border border-red-500/30 hover:border-red-500/60 transition-colors"
                data-testid="btn-sign-out"
                aria-label="Sign out of your account"
              >
                Sign out
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
